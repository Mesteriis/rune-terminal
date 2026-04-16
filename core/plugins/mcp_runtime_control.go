package plugins

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"strings"
	"sync"
	"time"
)

var (
	ErrMCPExplicitStartRequired = errors.New("mcp server is stopped; explicit start required")
)

type MCPRuntime struct {
	registry *MCPRegistry
	spawner  ProcessSpawner
	invoker  MCPInvoker
	nowFn    func() time.Time

	mu      sync.Mutex
	process map[string]*mcpProcess
}

type MCPInvoker interface {
	Invoke(context.Context, MCPServerSpec, json.RawMessage) (json.RawMessage, error)
}

type MCPInvokeRequest struct {
	ServerID           string          `json:"server_id"`
	Payload            json.RawMessage `json:"payload,omitempty"`
	AllowOnDemandStart bool            `json:"allow_on_demand_start,omitempty"`
}

type MCPInvokeResult struct {
	ServerID string          `json:"server_id"`
	Output   json.RawMessage `json:"output,omitempty"`
}

type mcpProcess struct {
	process Process
	cancel  context.CancelFunc
	waitCh  chan error
}

func NewMCPRuntime(registry *MCPRegistry, spawner ProcessSpawner, invoker MCPInvoker) *MCPRuntime {
	if registry == nil {
		registry = NewMCPRegistry()
	}
	if spawner == nil {
		spawner = OSProcessSpawner{}
	}
	return &MCPRuntime{
		registry: registry,
		spawner:  spawner,
		invoker:  invoker,
		nowFn:    time.Now,
		process:  make(map[string]*mcpProcess),
	}
}

func (r *MCPRuntime) Registry() *MCPRegistry {
	return r.registry
}

func (r *MCPRuntime) Start(ctx context.Context, serverID string) error {
	id := strings.TrimSpace(serverID)
	if id == "" {
		return ErrInvalidPluginSpec
	}

	r.mu.Lock()
	if _, running := r.process[id]; running {
		r.mu.Unlock()
		_ = r.registry.SetState(id, MCPStateIdle)
		_ = r.registry.SetActive(id, true)
		_ = r.registry.Touch(id, r.nowFn())
		return nil
	}
	r.mu.Unlock()

	spec, err := r.registry.Spec(id)
	if err != nil {
		return err
	}

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

func (r *MCPRuntime) Invoke(ctx context.Context, request MCPInvokeRequest) (MCPInvokeResult, error) {
	id := strings.TrimSpace(request.ServerID)
	if id == "" {
		return MCPInvokeResult{}, ErrInvalidPluginSpec
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

	spec, err := r.registry.Spec(id)
	if err != nil {
		return MCPInvokeResult{}, err
	}
	output := json.RawMessage(`{}`)
	if r.invoker != nil {
		output, err = r.invoker.Invoke(ctx, spec, request.Payload)
		if err != nil {
			return MCPInvokeResult{}, err
		}
	}

	_ = r.registry.SetState(id, MCPStateIdle)
	_ = r.registry.Touch(id, r.nowFn())
	return MCPInvokeResult{
		ServerID: id,
		Output:   output,
	}, nil
}

func (r *MCPRuntime) isRunning(serverID string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	_, ok := r.process[serverID]
	return ok
}
