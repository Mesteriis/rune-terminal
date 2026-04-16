package plugins

import (
	"errors"
	"sort"
	"strings"
	"sync"
	"time"
)

var (
	ErrMCPServerNotFound   = errors.New("mcp server not found")
	ErrMCPServerRegistered = errors.New("mcp server already registered")
)

type MCPProcessState string

const (
	MCPStateStopped     MCPProcessState = "stopped"
	MCPStateStarting    MCPProcessState = "starting"
	MCPStateActive      MCPProcessState = "active"
	MCPStateIdle        MCPProcessState = "idle"
	MCPStateStoppedAuto MCPProcessState = "stopped_auto"
)

type MCPServerType string

const (
	MCPServerTypeProcess MCPServerType = "process"
	MCPServerTypeRemote  MCPServerType = "remote"
)

type MCPRemoteConfig struct {
	Endpoint string
	Headers  map[string]string
}

type MCPServerSpec struct {
	ID      string
	Type    MCPServerType
	Process ProcessConfig
	Remote  *MCPRemoteConfig
}

type MCPServerSnapshot struct {
	ID       string          `json:"id"`
	Type     MCPServerType   `json:"type"`
	Endpoint string          `json:"endpoint,omitempty"`
	State    MCPProcessState `json:"state"`
	LastUsed time.Time       `json:"last_used,omitempty"`
	Active   bool            `json:"active"`
	Enabled  bool            `json:"enabled"`
}

type MCPRegistry struct {
	mu      sync.RWMutex
	servers map[string]*mcpRegistryEntry
}

type mcpRegistryEntry struct {
	spec     MCPServerSpec
	state    MCPProcessState
	lastUsed time.Time
	active   bool
	enabled  bool
}

func NewMCPRegistry() *MCPRegistry {
	return &MCPRegistry{
		servers: make(map[string]*mcpRegistryEntry),
	}
}

func (r *MCPRegistry) Register(spec MCPServerSpec) error {
	id := strings.TrimSpace(spec.ID)
	if id == "" {
		return ErrInvalidPluginSpec
	}
	serverType := spec.Type
	if serverType == "" {
		serverType = MCPServerTypeProcess
	}
	if serverType != MCPServerTypeProcess && serverType != MCPServerTypeRemote {
		return ErrInvalidPluginSpec
	}

	normalized := MCPServerSpec{
		ID:   id,
		Type: serverType,
	}
	switch serverType {
	case MCPServerTypeProcess:
		if strings.TrimSpace(spec.Process.Command) == "" {
			return ErrInvalidPluginSpec
		}
		normalized.Process = spec.Process
	case MCPServerTypeRemote:
		if spec.Remote == nil || strings.TrimSpace(spec.Remote.Endpoint) == "" {
			return ErrInvalidPluginSpec
		}
		remoteHeaders := make(map[string]string, len(spec.Remote.Headers))
		for key, value := range spec.Remote.Headers {
			remoteHeaders[key] = value
		}
		normalized.Remote = &MCPRemoteConfig{
			Endpoint: strings.TrimSpace(spec.Remote.Endpoint),
			Headers:  remoteHeaders,
		}
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.servers[id]; exists {
		return ErrMCPServerRegistered
	}
	r.servers[id] = &mcpRegistryEntry{
		spec:    normalized,
		state:   MCPStateStopped,
		active:  false,
		enabled: true,
	}
	return nil
}

func (r *MCPRegistry) List() []MCPServerSnapshot {
	r.mu.RLock()
	defer r.mu.RUnlock()

	ids := make([]string, 0, len(r.servers))
	for id := range r.servers {
		ids = append(ids, id)
	}
	sort.Strings(ids)

	servers := make([]MCPServerSnapshot, 0, len(ids))
	for _, id := range ids {
		entry := r.servers[id]
		servers = append(servers, MCPServerSnapshot{
			ID:       entry.spec.ID,
			Type:     entry.spec.Type,
			Endpoint: snapshotEndpoint(entry.spec),
			State:    entry.state,
			LastUsed: entry.lastUsed,
			Active:   entry.active,
			Enabled:  entry.enabled,
		})
	}
	return servers
}

func (r *MCPRegistry) Get(id string) (MCPServerSnapshot, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	entry, ok := r.servers[strings.TrimSpace(id)]
	if !ok {
		return MCPServerSnapshot{}, ErrMCPServerNotFound
	}
	return MCPServerSnapshot{
		ID:       entry.spec.ID,
		Type:     entry.spec.Type,
		Endpoint: snapshotEndpoint(entry.spec),
		State:    entry.state,
		LastUsed: entry.lastUsed,
		Active:   entry.active,
		Enabled:  entry.enabled,
	}, nil
}

func (r *MCPRegistry) Spec(id string) (MCPServerSpec, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	entry, ok := r.servers[strings.TrimSpace(id)]
	if !ok {
		return MCPServerSpec{}, ErrMCPServerNotFound
	}
	return MCPServerSpec{
		ID:      entry.spec.ID,
		Type:    entry.spec.Type,
		Process: entry.spec.Process,
		Remote:  cloneRemoteConfig(entry.spec.Remote),
	}, nil
}

func (r *MCPRegistry) SetState(id string, state MCPProcessState) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	entry, ok := r.servers[strings.TrimSpace(id)]
	if !ok {
		return ErrMCPServerNotFound
	}
	entry.state = state
	return nil
}

func (r *MCPRegistry) SetActive(id string, active bool) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	entry, ok := r.servers[strings.TrimSpace(id)]
	if !ok {
		return ErrMCPServerNotFound
	}
	entry.active = active
	return nil
}

func (r *MCPRegistry) Touch(id string, at time.Time) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	entry, ok := r.servers[strings.TrimSpace(id)]
	if !ok {
		return ErrMCPServerNotFound
	}
	entry.lastUsed = at.UTC()
	return nil
}

func (r *MCPRegistry) SetEnabled(id string, enabled bool) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	entry, ok := r.servers[strings.TrimSpace(id)]
	if !ok {
		return ErrMCPServerNotFound
	}
	entry.enabled = enabled
	return nil
}

func snapshotEndpoint(spec MCPServerSpec) string {
	if spec.Remote == nil {
		return ""
	}
	return strings.TrimSpace(spec.Remote.Endpoint)
}

func cloneRemoteConfig(remote *MCPRemoteConfig) *MCPRemoteConfig {
	if remote == nil {
		return nil
	}
	headers := make(map[string]string, len(remote.Headers))
	for key, value := range remote.Headers {
		headers[key] = value
	}
	return &MCPRemoteConfig{
		Endpoint: strings.TrimSpace(remote.Endpoint),
		Headers:  headers,
	}
}
