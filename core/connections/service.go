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

	"github.com/Mesteriis/rune-terminal/internal/atomicfile"
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
	LaunchMode   string                `json:"launch_mode,omitempty"`
	TmuxSession  string                `json:"tmux_session,omitempty"`
	Runtime      persistedRuntimeState `json:"runtime,omitempty"`
}

type Service struct {
	mu        sync.RWMutex
	path      string
	checker   Checker
	tmuxProbe TmuxProbe
	state     persistedState
}

func NewService(path string) (*Service, error) {
	return NewServiceWithCheckerAndTmuxProbe(path, DefaultChecker(), DefaultTmuxProbe())
}

func NewServiceWithChecker(path string, checker Checker) (*Service, error) {
	return NewServiceWithCheckerAndTmuxProbe(path, checker, DefaultTmuxProbe())
}

func NewServiceWithCheckerAndTmuxProbe(path string, checker Checker, tmuxProbe TmuxProbe) (*Service, error) {
	if checker == nil {
		checker = DefaultChecker()
	}
	if tmuxProbe == nil {
		tmuxProbe = DefaultTmuxProbe()
	}
	svc := &Service{
		path:      path,
		checker:   checker,
		tmuxProbe: tmuxProbe,
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
		nextState := clonePersistedState(svc.state)
		nextState.ActiveConnectionID = localConnection().ID
		if err := svc.persistStateLocked(nextState); err != nil {
			return nil, err
		}
		svc.state = nextState
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

func (s *Service) ListRemoteProfiles() []RemoteProfile {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.listRemoteProfilesLocked()
}

func (s *Service) SaveRemoteProfile(input SaveRemoteProfileInput) (RemoteProfile, []RemoteProfile, error) {
	connection, _, err := s.SaveSSH(input.toSaveSSHInput())
	if err != nil {
		return RemoteProfile{}, nil, err
	}
	profile := RemoteProfile{
		ID:           connection.ID,
		Name:         connection.Name,
		Host:         connection.SSH.Host,
		User:         connection.SSH.User,
		Port:         connection.SSH.Port,
		IdentityFile: connection.SSH.IdentityFile,
		LaunchMode:   connection.SSH.LaunchMode,
		TmuxSession:  connection.SSH.TmuxSession,
		Description:  describeRemoteProfile(connection.SSH.User, connection.SSH.Host),
	}
	return profile, s.ListRemoteProfiles(), nil
}

func (s *Service) DeleteRemoteProfile(id string) ([]RemoteProfile, error) {
	id = strings.TrimSpace(id)
	if id == "" || id == localConnection().ID {
		return nil, fmt.Errorf("%w: invalid remote profile id", ErrInvalidConnection)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	index := -1
	for i, conn := range s.state.SSHConnections {
		if conn.ID == id {
			index = i
			break
		}
	}
	if index == -1 {
		return nil, fmt.Errorf("%w: %s", ErrConnectionNotFound, id)
	}
	nextState := clonePersistedState(s.state)
	nextState.SSHConnections = append(nextState.SSHConnections[:index], nextState.SSHConnections[index+1:]...)
	if nextState.ActiveConnectionID == id {
		nextState.ActiveConnectionID = localConnection().ID
	}
	if err := s.persistStateLocked(nextState); err != nil {
		return nil, err
	}
	s.state = nextState
	return s.listRemoteProfilesLocked(), nil
}

func (s *Service) ListRemoteProfileTmuxSessions(ctx context.Context, id string) ([]TmuxSession, error) {
	s.mu.RLock()
	connection, err := s.resolveLocked(strings.TrimSpace(id))
	probe := s.tmuxProbe
	s.mu.RUnlock()
	if err != nil {
		return nil, err
	}
	if connection.Kind != KindSSH {
		return nil, fmt.Errorf("%w: tmux sessions require an ssh profile", ErrInvalidConnection)
	}
	return probe.ListSessions(ctx, connection)
}

func (s *Service) Select(id string) (Snapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, err := s.resolveLocked(id); err != nil {
		return Snapshot{}, err
	}
	nextState := clonePersistedState(s.state)
	nextState.ActiveConnectionID = id
	if err := s.persistStateLocked(nextState); err != nil {
		return Snapshot{}, err
	}
	s.state = nextState
	return s.snapshotLocked(), nil
}

func (s *Service) SaveSSH(input SaveSSHInput) (Connection, Snapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	nextState := clonePersistedState(s.state)
	connection, err := s.saveSSHInState(&nextState, input)
	if err != nil {
		return Connection{}, Snapshot{}, err
	}
	if err := s.persistStateLocked(nextState); err != nil {
		return Connection{}, Snapshot{}, err
	}
	s.state = nextState
	return connection, s.snapshotLocked(), nil
}

func (s *Service) saveSSHInState(state *persistedState, input SaveSSHInput) (Connection, error) {
	normalized, err := normalizeSSHInput(input)
	if err != nil {
		return Connection{}, err
	}

	index := -1
	for i, conn := range state.SSHConnections {
		if conn.ID == normalized.ID {
			index = i
			normalized.Runtime = conn.Runtime
			if hasMaterialSSHProfileChange(conn, normalized) {
				resetLaunchRuntimeState(&normalized.Runtime)
			}
			break
		}
	}
	if index >= 0 {
		state.SSHConnections[index] = normalized
	} else {
		state.SSHConnections = append(state.SSHConnections, normalized)
	}
	if state.ActiveConnectionID == "" {
		state.ActiveConnectionID = normalized.ID
	}

	connection := normalized.toConnection()
	result := s.checker.Check(context.Background(), connection)
	applyCheckResultToState(state, normalized.ID, result)
	connection, err = resolveFromState(*state, normalized.ID)
	if err != nil {
		return Connection{}, err
	}
	return connection, nil
}

func (s *Service) Check(ctx context.Context, id string) (Connection, Snapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	connection, err := s.resolveLocked(id)
	if err != nil {
		return Connection{}, Snapshot{}, err
	}
	result := s.checker.Check(ctx, connection)
	nextState := clonePersistedState(s.state)
	applyCheckResultToState(&nextState, id, result)
	if err := s.persistStateLocked(nextState); err != nil {
		return Connection{}, Snapshot{}, err
	}
	s.state = nextState
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
	nextState := clonePersistedState(s.state)
	applyLaunchResultToState(&nextState, id, err)
	if err := s.persistStateLocked(nextState); err != nil {
		return Connection{}, Snapshot{}, err
	}
	s.state = nextState
	connection, resolveErr := s.resolveLocked(id)
	if resolveErr != nil {
		return Connection{}, Snapshot{}, resolveErr
	}
	return connection, s.snapshotLocked(), nil
}

func (s *Service) snapshotLocked() Snapshot {
	return snapshotFromState(s.state)
}

func snapshotFromState(state persistedState) Snapshot {
	connections := []Connection{localConnection()}
	for _, saved := range state.SSHConnections {
		connections = append(connections, saved.toConnection())
	}
	for i := range connections {
		connections[i].Active = connections[i].ID == state.ActiveConnectionID
	}
	return Snapshot{
		Connections:        slices.Clone(connections),
		ActiveConnectionID: state.ActiveConnectionID,
	}
}

func (s *Service) listRemoteProfilesLocked() []RemoteProfile {
	return listRemoteProfilesFromState(s.state)
}

func listRemoteProfilesFromState(state persistedState) []RemoteProfile {
	profiles := make([]RemoteProfile, 0, len(state.SSHConnections))
	for _, saved := range state.SSHConnections {
		profiles = append(profiles, saved.toRemoteProfile())
	}
	return profiles
}

func (s *Service) resolveLocked(id string) (Connection, error) {
	return resolveFromState(s.state, id)
}

func resolveFromState(state persistedState, id string) (Connection, error) {
	for _, connection := range snapshotFromState(state).Connections {
		if connection.ID == id {
			return connection, nil
		}
	}
	return Connection{}, fmt.Errorf("%w: %s", ErrConnectionNotFound, id)
}

func (s *Service) resolveSavedSSHLocked(id string) (*savedSSH, error) {
	return resolveSavedSSHInState(&s.state, id)
}

func resolveSavedSSHInState(state *persistedState, id string) (*savedSSH, error) {
	for i := range state.SSHConnections {
		if state.SSHConnections[i].ID == id {
			return &state.SSHConnections[i], nil
		}
	}
	return nil, fmt.Errorf("%w: %s", ErrConnectionNotFound, id)
}

func applyCheckResultToState(state *persistedState, id string, result CheckResult) {
	if id == localConnection().ID {
		return
	}
	saved, err := resolveSavedSSHInState(state, id)
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

func applyLaunchResultToState(state *persistedState, id string, launchErr error) {
	now := time.Now().UTC()
	if id == localConnection().ID {
		return
	}
	saved, err := resolveSavedSSHInState(state, id)
	if err != nil {
		return
	}
	saved.Runtime.LastLaunchedAt = &now
	if launchErr != nil {
		saved.Runtime.LaunchStatus = LaunchStatusFailed
		saved.Runtime.LaunchError = normalizeLaunchError(launchErr)
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
	return s.persistStateLocked(s.state)
}

func (s *Service) persistStateLocked(state persistedState) error {
	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return err
	}
	payload, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	return atomicfile.WriteFile(s.path, payload, 0o600)
}

func clonePersistedState(state persistedState) persistedState {
	return persistedState{
		ActiveConnectionID: state.ActiveConnectionID,
		SSHConnections:     slices.Clone(state.SSHConnections),
	}
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
	launchMode, tmuxSession, err := normalizeRemoteLaunchPolicy(input.LaunchMode, input.TmuxSession, name, host, id)
	if err != nil {
		return savedSSH{}, err
	}
	return savedSSH{
		ID:           id,
		Name:         name,
		Host:         host,
		User:         strings.TrimSpace(input.User),
		Port:         input.Port,
		IdentityFile: normalizeIdentityFile(input.IdentityFile),
		LaunchMode:   launchMode,
		TmuxSession:  tmuxSession,
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
			LaunchMode:   s.LaunchMode,
			TmuxSession:  s.TmuxSession,
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
