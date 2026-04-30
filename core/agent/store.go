package agent

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"sync"
	"time"

	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/internal/atomicfile"
)

type Store struct {
	mu   sync.RWMutex
	path string
	data State
}

func NewStore(path string) (*Store, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, err
	}
	store := &Store{path: path}
	if err := store.load(); err != nil {
		return nil, err
	}
	return store, nil
}

func (s *Store) load() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	payload, err := os.ReadFile(s.path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			s.data = defaultState()
			return s.saveLocked()
		}
		return err
	}
	if err := json.Unmarshal(payload, &s.data); err != nil {
		return err
	}
	normalized, changed := normalizeProviderState(s.data)
	s.data = normalized
	if changed {
		return s.saveLocked()
	}
	return nil
}

func (s *Store) Snapshot() State {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return cloneState(s.data)
}

func (s *Store) Selection() (Selection, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return selectionFromState(s.data)
}

func (s *Store) Catalog() (Catalog, error) {
	snapshot := s.Snapshot()
	selection, err := selectionFromState(snapshot)
	if err != nil {
		return Catalog{}, err
	}
	return Catalog{
		Profiles: snapshot.Profiles,
		Roles:    snapshot.Roles,
		Modes:    snapshot.Modes,
		Active:   selection.View(),
	}, nil
}

func (s *Store) PolicyProfile() policy.EvaluationProfile {
	selection, err := s.Selection()
	if err != nil {
		return policy.EvaluationProfile{}
	}
	return selection.EffectivePolicyProfile()
}

func (s *Store) SetActiveProfile(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := findByID(s.data.Profiles, id); !ok {
		return fmt.Errorf("%w: %s", ErrPromptProfileNotFound, id)
	}
	nextData := cloneState(s.data)
	nextData.ActiveProfileID = id
	nextData.UpdatedAt = time.Now().UTC()
	if err := s.saveStateLocked(nextData); err != nil {
		return err
	}
	s.data = nextData
	return nil
}

func (s *Store) SetActiveRole(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := findByID(s.data.Roles, id); !ok {
		return fmt.Errorf("%w: %s", ErrRolePresetNotFound, id)
	}
	nextData := cloneState(s.data)
	nextData.ActiveRoleID = id
	nextData.UpdatedAt = time.Now().UTC()
	if err := s.saveStateLocked(nextData); err != nil {
		return err
	}
	s.data = nextData
	return nil
}

func (s *Store) SetActiveMode(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := findByID(s.data.Modes, id); !ok {
		return fmt.Errorf("%w: %s", ErrWorkModeNotFound, id)
	}
	nextData := cloneState(s.data)
	nextData.ActiveModeID = id
	nextData.UpdatedAt = time.Now().UTC()
	if err := s.saveStateLocked(nextData); err != nil {
		return err
	}
	s.data = nextData
	return nil
}

func (s *Store) saveLocked() error {
	return s.saveStateLocked(s.data)
}

func (s *Store) saveStateLocked(data State) error {
	payload, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}
	return atomicfile.WriteFile(s.path, payload, 0o600)
}

func selectionFromState(state State) (Selection, error) {
	profile, ok := findByID(state.Profiles, state.ActiveProfileID)
	if !ok {
		return Selection{}, fmt.Errorf("%w: %s", ErrPromptProfileNotFound, state.ActiveProfileID)
	}
	role, ok := findByID(state.Roles, state.ActiveRoleID)
	if !ok {
		return Selection{}, fmt.Errorf("%w: %s", ErrRolePresetNotFound, state.ActiveRoleID)
	}
	mode, ok := findByID(state.Modes, state.ActiveModeID)
	if !ok {
		return Selection{}, fmt.Errorf("%w: %s", ErrWorkModeNotFound, state.ActiveModeID)
	}
	return Selection{Profile: profile, Role: role, Mode: mode}, nil
}

type withID interface {
	GetID() string
}

func (p PromptProfile) GetID() string { return p.ID }
func (r RolePreset) GetID() string    { return r.ID }
func (m WorkMode) GetID() string      { return m.ID }

func findByID[T withID](items []T, id string) (T, bool) {
	for _, item := range items {
		if item.GetID() == id {
			return item, true
		}
	}
	var zero T
	return zero, false
}

func cloneState(state State) State {
	state.Profiles = slices.Clone(state.Profiles)
	state.Roles = slices.Clone(state.Roles)
	state.Modes = slices.Clone(state.Modes)
	state.Providers = cloneProviderRecords(state.Providers)
	return state
}
