package connections

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/Mesteriis/rune-terminal/internal/ids"
)

type persistedState struct {
	ActiveConnectionID string     `json:"active_connection_id"`
	SSHConnections     []savedSSH `json:"ssh_connections,omitempty"`
}

type persistedRuntimeState struct {
	CheckStatus    CheckStatus  `json:"check_status,omitempty"`
	CheckError     string       `json:"check_error,omitempty"`
	LastCheckedAt  *time.Time   `json:"last_checked_at,omitempty"`
	LaunchStatus   LaunchStatus `json:"launch_status,omitempty"`
	LaunchError    string       `json:"launch_error,omitempty"`
	LastLaunchedAt *time.Time   `json:"last_launched_at,omitempty"`
}

type savedSSH struct {
	ID           string                `json:"id"`
	Name         string                `json:"name"`
	Host         string                `json:"host"`
	User         string                `json:"user,omitempty"`
	Port         int                   `json:"port,omitempty"`
	IdentityFile string                `json:"identity_file,omitempty"`
	Runtime      persistedRuntimeState `json:"runtime,omitempty"`
}

type Service struct {
	mu      sync.RWMutex
	path    string
	checker Checker
	state   persistedState
}

func NewService(path string) (*Service, error) {
	return NewServiceWithChecker(path, DefaultChecker())
}

func NewServiceWithChecker(path string, checker Checker) (*Service, error) {
	if checker == nil {
		checker = DefaultChecker()
	}
	svc := &Service{
		path:    path,
		checker: checker,
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
	if _, err := svc.resolveSavedSSHLocked(svc.state.ActiveConnectionID); err != nil && svc.state.ActiveConnectionID != localConnection().ID {
		svc.state.ActiveConnectionID = localConnection().ID
		if err := svc.persistLocked(); err != nil {
			return nil, err
		}
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
			normalized.Runtime = conn.Runtime
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

	connection := normalized.toConnection()
	result := s.checker.Check(context.Background(), connection)
	s.applyCheckResultLocked(normalized.ID, result)
	if err := s.persistLocked(); err != nil {
		return Connection{}, Snapshot{}, err
	}
	connection, err = s.resolveLocked(normalized.ID)
	if err != nil {
		return Connection{}, Snapshot{}, err
	}
	return connection, s.snapshotLocked(), nil
}

func (s *Service) Check(ctx context.Context, id string) (Connection, Snapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	connection, err := s.resolveLocked(id)
	if err != nil {
		return Connection{}, Snapshot{}, err
	}
	result := s.checker.Check(ctx, connection)
	s.applyCheckResultLocked(id, result)
	if err := s.persistLocked(); err != nil {
		return Connection{}, Snapshot{}, err
	}
	connection, err = s.resolveLocked(id)
	if err != nil {
		return Connection{}, Snapshot{}, err
	}
	return connection, s.snapshotLocked(), nil
}

func (s *Service) ReportLaunchResult(id string, err error) (Connection, Snapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, err := s.resolveLocked(id); err != nil {
		return Connection{}, Snapshot{}, err
	}
	s.applyLaunchResultLocked(id, err)
	if err := s.persistLocked(); err != nil {
		return Connection{}, Snapshot{}, err
	}
	connection, resolveErr := s.resolveLocked(id)
	if resolveErr != nil {
		return Connection{}, Snapshot{}, resolveErr
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

func (s *Service) resolveSavedSSHLocked(id string) (*savedSSH, error) {
	for i := range s.state.SSHConnections {
		if s.state.SSHConnections[i].ID == id {
			return &s.state.SSHConnections[i], nil
		}
	}
	return nil, fmt.Errorf("%w: %s", ErrConnectionNotFound, id)
}

func (s *Service) applyCheckResultLocked(id string, result CheckResult) {
	if id == localConnection().ID {
		return
	}
	saved, err := s.resolveSavedSSHLocked(id)
	if err != nil {
		return
	}
	saved.Runtime.CheckStatus = result.Status
	saved.Runtime.CheckError = strings.TrimSpace(result.Error)
	saved.Runtime.LastCheckedAt = &result.CheckedAt
	if result.Status == CheckStatusPassed {
		saved.Runtime.CheckError = ""
	}
}

func (s *Service) applyLaunchResultLocked(id string, launchErr error) {
	now := time.Now().UTC()
	if id == localConnection().ID {
		return
	}
	saved, err := s.resolveSavedSSHLocked(id)
	if err != nil {
		return
	}
	saved.Runtime.LastLaunchedAt = &now
	if launchErr != nil {
		saved.Runtime.LaunchStatus = LaunchStatusFailed
		saved.Runtime.LaunchError = strings.TrimSpace(launchErr.Error())
		return
	}
	saved.Runtime.LaunchStatus = LaunchStatusSucceeded
	saved.Runtime.LaunchError = ""
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
		Usability:   UsabilityAvailable,
		Runtime: RuntimeState{
			CheckStatus:  CheckStatusPassed,
			LaunchStatus: LaunchStatusIdle,
		},
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
		IdentityFile: normalizeIdentityFile(input.IdentityFile),
		Runtime: persistedRuntimeState{
			CheckStatus:  CheckStatusUnchecked,
			LaunchStatus: LaunchStatusIdle,
		},
	}, nil
}

func (s savedSSH) toConnection() Connection {
	description := s.Host
	if s.User != "" {
		description = s.User + "@" + s.Host
	}
	runtime := RuntimeState{
		CheckStatus:    s.Runtime.CheckStatus,
		CheckError:     s.Runtime.CheckError,
		LastCheckedAt:  s.Runtime.LastCheckedAt,
		LaunchStatus:   s.Runtime.LaunchStatus,
		LaunchError:    s.Runtime.LaunchError,
		LastLaunchedAt: s.Runtime.LastLaunchedAt,
	}
	if runtime.CheckStatus == "" {
		runtime.CheckStatus = CheckStatusUnchecked
	}
	if runtime.LaunchStatus == "" {
		runtime.LaunchStatus = LaunchStatusIdle
	}
	return Connection{
		ID:          s.ID,
		Kind:        KindSSH,
		Name:        s.Name,
		Description: description,
		Status:      StatusConfigured,
		Usability:   runtime.usability(),
		Runtime:     runtime,
		SSH: &SSHConfig{
			Host:         s.Host,
			User:         s.User,
			Port:         s.Port,
			IdentityFile: s.IdentityFile,
		},
	}
}

func (r RuntimeState) usability() Usability {
	switch {
	case r.LaunchStatus == LaunchStatusFailed || r.CheckStatus == CheckStatusFailed:
		return UsabilityAttention
	case r.LaunchStatus == LaunchStatusSucceeded || r.CheckStatus == CheckStatusPassed:
		return UsabilityAvailable
	default:
		return UsabilityUnknown
	}
}
