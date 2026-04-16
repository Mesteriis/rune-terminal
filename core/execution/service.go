package execution

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/Mesteriis/rune-terminal/internal/ids"
)

type persistedState struct {
	Blocks    []Block   `json:"blocks"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Service struct {
	mu    sync.RWMutex
	path  string
	state persistedState
}

func NewService(path string) (*Service, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, err
	}
	service := &Service{
		path: path,
		state: persistedState{
			Blocks: []Block{},
		},
	}
	if err := service.load(); err != nil {
		return nil, err
	}
	return service, nil
}

func (s *Service) Append(block Block) (Block, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now().UTC()
	if block.ID == "" {
		block.ID = ids.New("execblk")
	}
	if block.CreatedAt.IsZero() {
		block.CreatedAt = now
	}
	block.UpdatedAt = now

	s.state.Blocks = append(s.state.Blocks, block)
	s.state.UpdatedAt = now
	if err := s.persistLocked(); err != nil {
		return Block{}, err
	}
	return block, nil
}

func (s *Service) List(workspaceID string, limit int) []Block {
	s.mu.RLock()
	defer s.mu.RUnlock()

	trimmedWorkspaceID := workspaceID
	filtered := make([]Block, 0, len(s.state.Blocks))
	for _, block := range s.state.Blocks {
		if trimmedWorkspaceID != "" && block.Target.WorkspaceID != trimmedWorkspaceID {
			continue
		}
		filtered = append(filtered, block)
	}
	if limit > 0 && len(filtered) > limit {
		filtered = filtered[len(filtered)-limit:]
	}
	return append([]Block(nil), filtered...)
}

func (s *Service) Get(id string) (Block, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, block := range s.state.Blocks {
		if block.ID == id {
			return block, true
		}
	}
	return Block{}, false
}

func (s *Service) load() error {
	raw, err := os.ReadFile(s.path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return s.persist()
		}
		return err
	}
	var state persistedState
	if err := json.Unmarshal(raw, &state); err != nil {
		return err
	}
	if state.Blocks == nil {
		state.Blocks = []Block{}
	}
	s.state = state
	return nil
}

func (s *Service) persist() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.persistLocked()
}

func (s *Service) persistLocked() error {
	payload, err := json.MarshalIndent(s.state, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.path, append(payload, '\n'), 0o600)
}
