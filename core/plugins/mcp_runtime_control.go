package plugins

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"strings"
	"sync"
	"time"
)

var (
	ErrMCPExplicitStartRequired = errors.New("mcp server is stopped; explicit start required")
	ErrMCPServerBusy            = errors.New("mcp server has in-flight calls")
	ErrMCPServerDisabled        = errors.New("mcp server is disabled")
)

type MCPRuntime struct {
	registry   *MCPRegistry
	spawner    ProcessSpawner
	invoker    MCPInvoker
	nowFn      func() time.Time
	idleTTL    time.Duration
	adapter    MCPContextAdapter
	normalizer MCPOutputNormalizer

	mu         sync.Mutex
	process    map[string]*mcpProcess
	stopIdleCh chan struct{}
	stopOnce   sync.Once
}

type MCPInvoker interface {
	Invoke(context.Context, MCPServerSpec, json.RawMessage) (json.RawMessage, error)
}

type MCPRuntimeOptions struct {
	NowFn             func() time.Time
	IdleTimeout       time.Duration
	IdleCheckInterval time.Duration
	ContextAdapter    MCPContextAdapter
	OutputNormalizer  MCPOutputNormalizer
}

type MCPInvokeRequest struct {
	ServerID           string          `json:"server_id"`
	Payload            json.RawMessage `json:"payload,omitempty"`
	AllowOnDemandStart bool            `json:"allow_on_demand_start,omitempty"`
	IncludeContext     bool            `json:"include_context,omitempty"`
	ActionSource       string          `json:"action_source,omitempty"`
	WorkspaceID        string          `json:"workspace_id,omitempty"`
}

type MCPInvokeResult struct {
	ServerID string             `json:"server_id"`
	Output   any                `json:"output,omitempty"`
	Context  *MCPContextPayload `json:"context,omitempty"`
}

type mcpProcess struct {
	process Process
	cancel  context.CancelFunc
	waitCh  chan error
	inUse   int
}

func NewMCPRuntime(registry *MCPRegistry, spawner ProcessSpawner, invoker MCPInvoker) *MCPRuntime {
	return NewMCPRuntimeWithOptions(registry, spawner, invoker, MCPRuntimeOptions{})
}

func NewMCPRuntimeWithOptions(
	registry *MCPRegistry,
	spawner ProcessSpawner,
	invoker MCPInvoker,
	options MCPRuntimeOptions,
) *MCPRuntime {
	if registry == nil {
		registry = NewMCPRegistry()
	}
	if spawner == nil {
		spawner = OSProcessSpawner{}
	}
	nowFn := options.NowFn
	if nowFn == nil {
		nowFn = time.Now
	}
	idleTimeout := options.IdleTimeout
	if idleTimeout == 0 {
		idleTimeout = 7 * time.Minute
	}
	idleCheckInterval := options.IdleCheckInterval
	if idleCheckInterval == 0 {
		idleCheckInterval = time.Minute
	}
	adapter := options.ContextAdapter.withDefaults()
	normalizer := options.OutputNormalizer
	if normalizer == (MCPOutputNormalizer{}) {
		normalizer = DefaultMCPOutputNormalizer()
	}

	runtime := &MCPRuntime{
		registry:   registry,
		spawner:    spawner,
		invoker:    invoker,
		nowFn:      nowFn,
		idleTTL:    idleTimeout,
		adapter:    adapter,
		normalizer: normalizer,
		process:    make(map[string]*mcpProcess),
		stopIdleCh: make(chan struct{}),
	}
	go runtime.runIdleSweepLoop(idleCheckInterval)
	return runtime
}

func (r *MCPRuntime) Registry() *MCPRegistry {
	return r.registry
}

func (r *MCPRuntime) Close() {
	r.stopOnce.Do(func() {
		close(r.stopIdleCh)
	})
}

func (r *MCPRuntime) Start(ctx context.Context, serverID string) error {
	id := strings.TrimSpace(serverID)
	if id == "" {
		return ErrInvalidPluginSpec
	}
	server, err := r.registry.Get(id)
	if err != nil {
		return err
	}
	if !server.Enabled {
		return ErrMCPServerDisabled
	}

	spec, err := r.registry.Spec(id)
	if err != nil {
		return err
	}
	if spec.Type == MCPServerTypeRemote {
		if err := r.registry.SetState(id, MCPStateIdle); err != nil {
			return err
		}
		if err := r.registry.SetActive(id, true); err != nil {
			return err
		}
		return r.registry.Touch(id, r.nowFn())
	}

	r.mu.Lock()
	if process, running := r.process[id]; running {
		r.mu.Unlock()
		if process.inUse > 0 {
			_ = r.registry.SetState(id, MCPStateActive)
		} else {
			_ = r.registry.SetState(id, MCPStateIdle)
		}
		_ = r.registry.SetActive(id, true)
		_ = r.registry.Touch(id, r.nowFn())
		return nil
	}
	r.mu.Unlock()

	if err := r.registry.SetState(id, MCPStateStarting); err != nil {
		return err
	}
	if err := r.registry.SetActive(id, true); err != nil {
		return err
	}

	processCtx, cancel := context.WithCancel(context.Background())
	process, err := r.spawner.Spawn(processCtx, spec.Process)
	if err != nil {
		cancel()
		_ = r.registry.SetState(id, MCPStateStopped)
		_ = r.registry.SetActive(id, false)
		return err
	}

	waitCh := make(chan error, 1)
	go func() {
		waitCh <- process.Wait()
	}()
	go func() {
		_, _ = io.Copy(io.Discard, process.Stdout())
	}()

	r.mu.Lock()
	r.process[id] = &mcpProcess{
		process: process,
		cancel:  cancel,
		waitCh:  waitCh,
	}
	r.mu.Unlock()

	_ = r.registry.SetState(id, MCPStateIdle)
	_ = r.registry.SetActive(id, true)
	_ = r.registry.Touch(id, r.nowFn())
	return nil
}

func (r *MCPRuntime) Stop(serverID string, auto bool) error {
	id := strings.TrimSpace(serverID)
	if id == "" {
		return ErrInvalidPluginSpec
	}

	r.mu.Lock()
	running := r.process[id]
	if running != nil && running.inUse > 0 {
		r.mu.Unlock()
		return ErrMCPServerBusy
	}
	delete(r.process, id)
	r.mu.Unlock()

	state := MCPStateStopped
	if auto {
		state = MCPStateStoppedAuto
	}
	if running == nil {
		if err := r.registry.SetState(id, state); err != nil {
			return err
		}
		return r.registry.SetActive(id, false)
	}

	_ = running.process.Stdin().Close()
	_ = running.process.Kill()
	running.cancel()
	select {
	case <-running.waitCh:
	case <-time.After(500 * time.Millisecond):
	}

	if err := r.registry.SetState(id, state); err != nil {
		return err
	}
	if err := r.registry.SetActive(id, false); err != nil {
		return err
	}
	return r.registry.Touch(id, r.nowFn())
}

func (r *MCPRuntime) SetEnabled(serverID string, enabled bool) error {
	id := strings.TrimSpace(serverID)
	if id == "" {
		return ErrInvalidPluginSpec
	}

	if !enabled {
		if err := r.Stop(id, false); err != nil && !errors.Is(err, ErrMCPServerNotFound) {
			return err
		}
	}
	if err := r.registry.SetEnabled(id, enabled); err != nil {
		return err
	}
	if !enabled {
		_ = r.registry.SetActive(id, false)
	}
	return nil
}

func (r *MCPRuntime) Restart(ctx context.Context, serverID string) error {
	id := strings.TrimSpace(serverID)
	if id == "" {
		return ErrInvalidPluginSpec
	}
	server, err := r.registry.Get(id)
	if err != nil {
		return err
	}
	if !server.Enabled {
		return ErrMCPServerDisabled
	}
	if err := r.Stop(id, false); err != nil && !errors.Is(err, ErrMCPServerNotFound) {
		return err
	}
	return r.Start(ctx, id)
}

func (r *MCPRuntime) Invoke(ctx context.Context, request MCPInvokeRequest) (MCPInvokeResult, error) {
	id := strings.TrimSpace(request.ServerID)
	if id == "" {
		return MCPInvokeResult{}, ErrInvalidPluginSpec
	}
	server, err := r.registry.Get(id)
	if err != nil {
		return MCPInvokeResult{}, err
	}
	if !server.Enabled {
		return MCPInvokeResult{}, ErrMCPServerDisabled
	}
	spec, err := r.registry.Spec(id)
	if err != nil {
		return MCPInvokeResult{}, err
	}

	if !r.isRunning(id) {
		if !request.AllowOnDemandStart {
			return MCPInvokeResult{}, ErrMCPExplicitStartRequired
		}
		if err := r.Start(ctx, id); err != nil {
			return MCPInvokeResult{}, err
		}
	}

	if err := r.registry.SetState(id, MCPStateActive); err != nil {
		return MCPInvokeResult{}, err
	}
	if err := r.registry.Touch(id, r.nowFn()); err != nil {
		return MCPInvokeResult{}, err
	}
	if spec.Type == MCPServerTypeProcess {
		process := r.acquireProcess(id)
		if process == nil {
			return MCPInvokeResult{}, ErrMCPExplicitStartRequired
		}
		defer r.releaseProcess(id, process)
	} else {
		defer func() {
			_ = r.registry.SetState(id, MCPStateIdle)
			_ = r.registry.Touch(id, r.nowFn())
		}()
	}

	output := json.RawMessage(`{}`)
	if r.invoker != nil {
		output, err = r.invoker.Invoke(ctx, spec, request.Payload)
		if err != nil {
			return MCPInvokeResult{}, err
		}
	}
	normalizedOutput, err := r.normalizer.Normalize(output)
	if err != nil {
		return MCPInvokeResult{}, err
	}

	var contextPayload *MCPContextPayload
	if request.IncludeContext {
		adapted, err := r.adapter.Adapt(output)
		if err != nil {
			return MCPInvokeResult{}, err
		}
		contextPayload = &adapted
	}
	return MCPInvokeResult{
		ServerID: id,
		Output:   normalizedOutput,
		Context:  contextPayload,
	}, nil
}

func (r *MCPRuntime) SweepIdle(now time.Time) {
	if r.idleTTL <= 0 {
		return
	}
	for _, server := range r.registry.List() {
		if server.State != MCPStateIdle || server.LastUsed.IsZero() {
			continue
		}
		if now.Sub(server.LastUsed) < r.idleTTL {
			continue
		}
		if err := r.Stop(server.ID, true); err == nil {
			log.Printf("mcp runtime auto-stop: id=%s idle_for=%s", server.ID, now.Sub(server.LastUsed).Round(time.Second))
		}
	}
}

func (r *MCPRuntime) runIdleSweepLoop(interval time.Duration) {
	if interval <= 0 {
		return
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			r.SweepIdle(r.nowFn())
		case <-r.stopIdleCh:
			return
		}
	}
}

func (r *MCPRuntime) acquireProcess(serverID string) *mcpProcess {
	r.mu.Lock()
	defer r.mu.Unlock()
	process := r.process[serverID]
	if process == nil {
		return nil
	}
	process.inUse++
	return process
}

func (r *MCPRuntime) releaseProcess(serverID string, process *mcpProcess) {
	r.mu.Lock()
	if process.inUse > 0 {
		process.inUse--
	}
	inUse := process.inUse
	r.mu.Unlock()

	if inUse == 0 {
		_ = r.registry.SetState(serverID, MCPStateIdle)
		_ = r.registry.Touch(serverID, r.nowFn())
	}
}

func (r *MCPRuntime) isRunning(serverID string) bool {
	r.mu.Lock()
	_, ok := r.process[serverID]
	r.mu.Unlock()
	if ok {
		return true
	}

	snapshot, err := r.registry.Get(serverID)
	if err != nil {
		return false
	}
	if snapshot.Type != MCPServerTypeRemote {
		return false
	}
	if !snapshot.Active || !snapshot.Enabled {
		return false
	}
	return snapshot.State == MCPStateIdle || snapshot.State == MCPStateActive || snapshot.State == MCPStateStarting
}
