package connections

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"sync"

	"github.com/Mesteriis/rune-terminal/internal/ids"
)

type persistedState struct {
	ActiveConnectionID string     `json:"active_connection_id"`
	SSHConnections     []savedSSH `json:"ssh_connections,omitempty"`
}

type savedSSH struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Host         string `json:"host"`
	User         string `json:"user,omitempty"`
	Port         int    `json:"port,omitempty"`
	IdentityFile string `json:"identity_file,omitempty"`
}

type Service struct {
	mu    sync.RWMutex
	path  string
	state persistedState
}

func NewService(path string) (*Service, error) {
	svc := &Service{
		path: path,
		state: persistedState{
			ActiveConnectionID: localConnection().ID,
		},
	}
	if err := svc.load(); err != nil {
		return nil, err
	}
	if svc.state.ActiveConnectionID == "" {
		svc.state.ActiveConnectionID = localConnection().ID
	}
	return svc, nil
}

func (s *Service) Snapshot() Snapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.snapshotLocked()
}

func (s *Service) Active() (Connection, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.resolveLocked(s.state.ActiveConnectionID)
}

func (s *Service) Resolve(id string) (Connection, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.resolveLocked(id)
}

func (s *Service) Select(id string) (Snapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, err := s.resolveLocked(id); err != nil {
		return Snapshot{}, err
	}
	s.state.ActiveConnectionID = id
	if err := s.persistLocked(); err != nil {
		return Snapshot{}, err
	}
	return s.snapshotLocked(), nil
}

func (s *Service) SaveSSH(input SaveSSHInput) (Connection, Snapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	normalized, err := normalizeSSHInput(input)
	if err != nil {
		return Connection{}, Snapshot{}, err
	}

	index := -1
	for i, conn := range s.state.SSHConnections {
		if conn.ID == normalized.ID {
			index = i
			break
		}
	}
	if index >= 0 {
		s.state.SSHConnections[index] = normalized
	} else {
		s.state.SSHConnections = append(s.state.SSHConnections, normalized)
	}
	if s.state.ActiveConnectionID == "" {
		s.state.ActiveConnectionID = normalized.ID
	}
	if err := s.persistLocked(); err != nil {
		return Connection{}, Snapshot{}, err
	}
	connection, err := s.resolveLocked(normalized.ID)
	if err != nil {
		return Connection{}, Snapshot{}, err
	}
	return connection, s.snapshotLocked(), nil
}

func (s *Service) snapshotLocked() Snapshot {
	connections := []Connection{localConnection()}
	for _, saved := range s.state.SSHConnections {
		connections = append(connections, saved.toConnection())
	}
	for i := range connections {
		connections[i].Active = connections[i].ID == s.state.ActiveConnectionID
	}
	return Snapshot{
		Connections:        slices.Clone(connections),
		ActiveConnectionID: s.state.ActiveConnectionID,
	}
}

func (s *Service) resolveLocked(id string) (Connection, error) {
	for _, connection := range s.snapshotLocked().Connections {
		if connection.ID == id {
			return connection, nil
		}
	}
	return Connection{}, fmt.Errorf("%w: %s", ErrConnectionNotFound, id)
}

func (s *Service) load() error {
	data, err := os.ReadFile(s.path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	if len(data) == 0 {
		return nil
	}
	var state persistedState
	if err := json.Unmarshal(data, &state); err != nil {
		return err
	}
	s.state = state
	return nil
}

func (s *Service) persistLocked() error {
	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return err
	}
	payload, err := json.MarshalIndent(s.state, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.path, payload, 0o600)
}

func localConnection() Connection {
	return Connection{
		ID:          "local",
		Kind:        KindLocal,
		Name:        "Local Machine",
		Description: "Local shell sessions launched through the Go runtime",
		Status:      StatusReady,
		Builtin:     true,
	}
}

func normalizeSSHInput(input SaveSSHInput) (savedSSH, error) {
	host := strings.TrimSpace(input.Host)
	if host == "" {
		return savedSSH{}, fmt.Errorf("%w: host is required", ErrInvalidConnection)
	}
	name := strings.TrimSpace(input.Name)
	if name == "" {
		name = host
	}
	if input.Port < 0 || input.Port > 65535 {
		return savedSSH{}, fmt.Errorf("%w: invalid ssh port", ErrInvalidConnection)
	}
	id := strings.TrimSpace(input.ID)
	if id == "" {
		id = ids.New("conn")
	}
	return savedSSH{
		ID:           id,
		Name:         name,
		Host:         host,
		User:         strings.TrimSpace(input.User),
		Port:         input.Port,
		IdentityFile: strings.TrimSpace(input.IdentityFile),
	}, nil
}

func (s savedSSH) toConnection() Connection {
	description := s.Host
	if s.User != "" {
		description = s.User + "@" + s.Host
	}
	return Connection{
		ID:          s.ID,
		Kind:        KindSSH,
		Name:        s.Name,
		Description: description,
		Status:      StatusConfigured,
		SSH: &SSHConfig{
			Host:         s.Host,
			User:         s.User,
			Port:         s.Port,
			IdentityFile: s.IdentityFile,
		},
	}
}
