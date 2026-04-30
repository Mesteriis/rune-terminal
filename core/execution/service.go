package execution

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/Mesteriis/rune-terminal/internal/atomicfile"
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

func isActiveState(state BlockState) bool {
	return state != BlockStateExecuted && state != BlockStateFailed
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

	nextState := clonePersistedState(s.state)
	nextState.Blocks = append(nextState.Blocks, block)
	nextState.UpdatedAt = now
	if err := s.persistStateLocked(nextState); err != nil {
		return Block{}, err
	}
	s.state = nextState
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

func (s *Service) Replace(block Block) (Block, bool, error) {
	if block.ID == "" {
		return Block{}, false, errors.New("block id is required")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	index := -1
	for i := range s.state.Blocks {
		if s.state.Blocks[i].ID == block.ID {
			index = i
			break
		}
	}
	if index == -1 {
		return Block{}, false, nil
	}

	now := time.Now().UTC()
	nextState := clonePersistedState(s.state)
	block.CreatedAt = nextState.Blocks[index].CreatedAt
	block.UpdatedAt = now

	nextState.Blocks[index] = block
	nextState.UpdatedAt = now
	if err := s.persistStateLocked(nextState); err != nil {
		return Block{}, false, err
	}
	s.state = nextState
	return block, true, nil
}

func (s *Service) ActiveCount() int {
	s.mu.RLock()
	defer s.mu.RUnlock()

	count := 0
	for _, block := range s.state.Blocks {
		if isActiveState(block.Result.State) {
			count++
		}
	}
	return count
}

func (s *Service) MarkActiveFailed(reason string) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	reason = strings.TrimSpace(reason)
	failedBy := reason
	if failedBy == "" {
		failedBy = "shutdown"
	}

	nextState := clonePersistedState(s.state)
	changed := 0
	for i := range nextState.Blocks {
		block := &nextState.Blocks[i]
		if !isActiveState(block.Result.State) {
			continue
		}
		block.Result.State = BlockStateFailed
		block.Result.OutputExcerpt = appendRunningFailReason(block.Result.OutputExcerpt, failedBy)
		block.UpdatedAt = time.Now().UTC()
		changed++
	}
	if changed == 0 {
		return 0, nil
	}
	nextState.UpdatedAt = time.Now().UTC()
	if err := s.persistStateLocked(nextState); err != nil {
		return 0, err
	}
	s.state = nextState
	return changed, nil
}

func appendRunningFailReason(existing, reason string) string {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return existing
	}
	existing = strings.TrimSpace(existing)
	if existing == "" {
		return "failed: " + reason
	}
	return existing + "\nfailed: " + reason
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
	return s.persistStateLocked(s.state)
}

func (s *Service) persistStateLocked(state persistedState) error {
	payload, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	return atomicfile.WriteFile(s.path, append(payload, '\n'), 0o600)
}

func clonePersistedState(state persistedState) persistedState {
	return persistedState{
		Blocks:    append([]Block(nil), state.Blocks...),
		UpdatedAt: state.UpdatedAt,
	}
}
