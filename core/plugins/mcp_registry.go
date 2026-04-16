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

type MCPServerSpec struct {
	ID      string
	Process ProcessConfig
}

type MCPServerSnapshot struct {
	ID       string          `json:"id"`
	State    MCPProcessState `json:"state"`
	LastUsed time.Time       `json:"last_used,omitempty"`
	Active   bool            `json:"active"`
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

	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.servers[id]; exists {
		return ErrMCPServerRegistered
	}
	r.servers[id] = &mcpRegistryEntry{
		spec: MCPServerSpec{
			ID:      id,
			Process: spec.Process,
		},
		state:  MCPStateStopped,
		active: false,
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
			State:    entry.state,
			LastUsed: entry.lastUsed,
			Active:   entry.active,
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
		State:    entry.state,
		LastUsed: entry.lastUsed,
		Active:   entry.active,
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
		Process: entry.spec.Process,
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
