package terminal

import (
	"context"
	"errors"
	"fmt"
	"os"
	"slices"
	"strings"
	"sync"
	"time"
)

const maxBufferedChunks = 512

type session struct {
	state   State
	process Process
	chunks  []OutputChunk
	exited  chan struct{}
	cancel  context.CancelFunc
}

type sessionGroup struct {
	activeSessionID string
	sessionOrder    []string
	sessions        map[string]*session
	subscribers     map[*subscriber]struct{}
}

type Service struct {
	mu       sync.RWMutex
	launcher Launcher
	groups   map[string]*sessionGroup
	starting map[string]*startCall
}

func NewService(launcher Launcher) *Service {
	return &Service{
		launcher: launcher,
		groups:   make(map[string]*sessionGroup),
		starting: make(map[string]*startCall),
	}
}

func (s *Service) StartSession(ctx context.Context, opts LaunchOptions) (State, error) {
	if opts.WidgetID == "" {
		return State{}, errors.New("widget id is required")
	}
	opts = normalizeLaunchOptions(opts)
	sessionID := resolveSessionID(opts)
	startKey := sessionStartKey(opts.WidgetID, sessionID)

	s.mu.Lock()
	if existing, ok := s.groups[opts.WidgetID]; ok {
		state, err := activeGroupStateLocked(existing)
		s.mu.Unlock()
		if err != nil {
			return State{}, err
		}
		return state, nil
	}
	if pending, ok := s.starting[startKey]; ok {
		s.mu.Unlock()
		return pending.wait(ctx)
	}
	pending := newStartCall()
	s.starting[startKey] = pending
	s.mu.Unlock()

	processCtx, cancel := context.WithCancel(context.Background())
	process, err := s.launcher.Launch(processCtx, opts)
	if err != nil {
		cancel()
		s.mu.Lock()
		delete(s.starting, startKey)
		pending.finish(State{}, err)
		s.mu.Unlock()
		return State{}, err
	}

	state := State{
		WidgetID:       opts.WidgetID,
		SessionID:      sessionID,
		Shell:          resolveShellName(opts),
		Restored:       opts.Restored,
		ConnectionID:   opts.Connection.ID,
		ConnectionName: opts.Connection.Name,
		ConnectionKind: opts.Connection.Kind,
		PID:            process.PID(),
		Status:         StatusRunning,
		StartedAt:      time.Now().UTC(),
		CanSendInput:   true,
		CanInterrupt:   true,
		WorkingDir:     resolveWorkingDir(opts),
	}

	sess := &session{
		state:   state,
		process: process,
		exited:  make(chan struct{}),
		cancel:  cancel,
	}

	s.mu.Lock()
	s.groups[opts.WidgetID] = &sessionGroup{
		activeSessionID: sessionID,
		sessionOrder:    []string{sessionID},
		sessions: map[string]*session{
			sessionID: sess,
		},
		subscribers: make(map[*subscriber]struct{}),
	}
	delete(s.starting, startKey)
	pending.finish(state, nil)
	s.mu.Unlock()

	go s.consumeOutput(opts.WidgetID, sessionID, sess)
	go s.waitForExit(opts.WidgetID, sessionID, sess)

	return state, nil
}

func (s *Service) CreateSession(ctx context.Context, opts LaunchOptions) (State, error) {
	if opts.WidgetID == "" {
		return State{}, errors.New("widget id is required")
	}
	opts = normalizeLaunchOptions(opts)
	sessionID := resolveSessionID(opts)
	startKey := sessionStartKey(opts.WidgetID, sessionID)

	s.mu.Lock()
	group, ok := s.groups[opts.WidgetID]
	if !ok {
		s.mu.Unlock()
		return State{}, fmt.Errorf("%w: %s", ErrWidgetNotFound, opts.WidgetID)
	}
	if existing, ok := group.sessions[sessionID]; ok {
		state := existing.state
		s.mu.Unlock()
		return state, nil
	}
	if pending, ok := s.starting[startKey]; ok {
		s.mu.Unlock()
		return pending.wait(ctx)
	}
	pending := newStartCall()
	s.starting[startKey] = pending
	s.mu.Unlock()

	processCtx, cancel := context.WithCancel(context.Background())
	process, err := s.launcher.Launch(processCtx, opts)
	if err != nil {
		cancel()
		s.mu.Lock()
		delete(s.starting, startKey)
		pending.finish(State{}, err)
		s.mu.Unlock()
		return State{}, err
	}

	state := State{
		WidgetID:       opts.WidgetID,
		SessionID:      sessionID,
		Shell:          resolveShellName(opts),
		Restored:       opts.Restored,
		ConnectionID:   opts.Connection.ID,
		ConnectionName: opts.Connection.Name,
		ConnectionKind: opts.Connection.Kind,
		PID:            process.PID(),
		Status:         StatusRunning,
		StartedAt:      time.Now().UTC(),
		CanSendInput:   true,
		CanInterrupt:   true,
		WorkingDir:     resolveWorkingDir(opts),
	}

	sess := &session{
		state:   state,
		process: process,
		exited:  make(chan struct{}),
		cancel:  cancel,
	}

	s.mu.Lock()
	group, ok = s.groups[opts.WidgetID]
	if !ok {
		delete(s.starting, startKey)
		pending.finish(State{}, fmt.Errorf("%w: %s", ErrWidgetNotFound, opts.WidgetID))
		s.mu.Unlock()
		cancel()
		_ = process.Close()
		return State{}, fmt.Errorf("%w: %s", ErrWidgetNotFound, opts.WidgetID)
	}
	group.sessions[sessionID] = sess
	group.sessionOrder = append(group.sessionOrder, sessionID)
	group.activeSessionID = sessionID
	delete(s.starting, startKey)
	pending.finish(state, nil)
	s.mu.Unlock()

	go s.consumeOutput(opts.WidgetID, sessionID, sess)
	go s.waitForExit(opts.WidgetID, sessionID, sess)

	return state, nil
}

func resolveShellName(opts LaunchOptions) string {
	if opts.Connection.Kind == "ssh" {
		return "ssh"
	}
	if opts.Shell != "" {
		return opts.Shell
	}
	return DefaultShell()
}

func resolveWorkingDir(opts LaunchOptions) string {
	if opts.Connection.Kind == "ssh" {
		return ""
	}
	return opts.WorkingDir
}

func normalizeLaunchOptions(opts LaunchOptions) LaunchOptions {
	if opts.Shell == "" {
		opts.Shell = DefaultShell()
	}
	opts.SessionID = strings.TrimSpace(opts.SessionID)
	opts.Connection = normalizeConnectionSpec(opts.Connection)
	return opts
}

func resolveSessionID(opts LaunchOptions) string {
	if opts.SessionID != "" {
		return opts.SessionID
	}
	return opts.WidgetID
}

func sessionStartKey(widgetID string, sessionID string) string {
	return widgetID + ":" + sessionID
}

func normalizeConnectionSpec(connection ConnectionSpec) ConnectionSpec {
	kind := strings.TrimSpace(connection.Kind)
	if kind == "" {
		kind = "local"
	}
	connection.Kind = kind
	if kind == "local" {
		if connection.ID == "" {
			connection.ID = "local"
		}
		if connection.Name == "" {
			connection.Name = "Local Machine"
		}
	}
	return connection
}

func (s *Service) GetState(widgetID string) (State, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	group, ok := s.groups[widgetID]
	if !ok {
		return State{}, fmt.Errorf("%w: %s", ErrWidgetNotFound, widgetID)
	}
	return activeGroupStateLocked(group)
}

func (s *Service) SendInput(widgetID string, text string, appendNewline bool) (InputResult, error) {
	s.mu.RLock()
	group, ok := s.groups[widgetID]
	s.mu.RUnlock()
	if !ok {
		return InputResult{}, fmt.Errorf("%w: %s", ErrWidgetNotFound, widgetID)
	}
	sess, err := activeGroupSessionLocked(group)
	if err != nil {
		return InputResult{}, err
	}
	if !sess.state.CanSendInput {
		return InputResult{}, fmt.Errorf("%w: %s", ErrCannotSendInput, widgetID)
	}

	if appendNewline {
		text += "\n"
	}
	n, err := sess.process.Write([]byte(text))
	if err != nil {
		return InputResult{}, err
	}
	return InputResult{
		WidgetID:      widgetID,
		BytesSent:     n,
		AppendNewline: appendNewline,
	}, nil
}

func (s *Service) Interrupt(widgetID string) error {
	s.mu.RLock()
	group, ok := s.groups[widgetID]
	s.mu.RUnlock()
	if !ok {
		return fmt.Errorf("%w: %s", ErrWidgetNotFound, widgetID)
	}
	sess, err := activeGroupSessionLocked(group)
	if err != nil {
		return err
	}
	if !sess.state.CanInterrupt {
		return fmt.Errorf("%w: %s", ErrCannotInterrupt, widgetID)
	}
	return sess.process.Signal(os.Interrupt)
}

func (s *Service) CloseSession(widgetID string) error {
	s.mu.Lock()
	group, ok := s.groups[widgetID]
	if !ok {
		s.mu.Unlock()
		return fmt.Errorf("%w: %s", ErrWidgetNotFound, widgetID)
	}
	delete(s.groups, widgetID)
	s.mu.Unlock()

	s.closeGroupSubscribers(group)
	for _, sessionID := range group.sessionOrder {
		sess := group.sessions[sessionID]
		if sess == nil {
			continue
		}
		if sess.cancel != nil {
			sess.cancel()
		}
		_ = sess.process.Close()
	}
	return nil
}

func (s *Service) CloseWidgetSession(widgetID string, sessionID string) error {
	s.mu.Lock()
	group, ok := s.groups[widgetID]
	if !ok {
		s.mu.Unlock()
		return fmt.Errorf("%w: %s", ErrWidgetNotFound, widgetID)
	}
	sess, ok := group.sessions[sessionID]
	if !ok {
		s.mu.Unlock()
		return fmt.Errorf("%w: %s", ErrSessionNotFound, sessionID)
	}

	delete(group.sessions, sessionID)
	group.sessionOrder = slices.DeleteFunc(group.sessionOrder, func(candidate string) bool {
		return candidate == sessionID
	})
	if group.activeSessionID == sessionID {
		if len(group.sessionOrder) > 0 {
			group.activeSessionID = group.sessionOrder[len(group.sessionOrder)-1]
		} else {
			group.activeSessionID = ""
		}
	}
	shouldDeleteGroup := len(group.sessionOrder) == 0
	if shouldDeleteGroup {
		delete(s.groups, widgetID)
	}
	s.mu.Unlock()

	if shouldDeleteGroup {
		s.closeGroupSubscribers(group)
	}
	if sess.cancel != nil {
		sess.cancel()
	}
	return sess.process.Close()
}

func (s *Service) SetActiveSession(widgetID string, sessionID string) (State, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	group, ok := s.groups[widgetID]
	if !ok {
		return State{}, fmt.Errorf("%w: %s", ErrWidgetNotFound, widgetID)
	}
	sess, ok := group.sessions[sessionID]
	if !ok {
		return State{}, fmt.Errorf("%w: %s", ErrSessionNotFound, sessionID)
	}
	group.activeSessionID = sessionID
	return sess.state, nil
}

func (s *Service) Snapshot(widgetID string, from uint64) (Snapshot, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	group, ok := s.groups[widgetID]
	if !ok {
		return Snapshot{}, fmt.Errorf("%w: %s", ErrWidgetNotFound, widgetID)
	}
	return snapshotFromGroupLocked(group, from)
}

func (s *Service) Subscribe(widgetID string) (<-chan OutputChunk, func(), error) {
	s.mu.Lock()
	group, ok := s.groups[widgetID]
	if !ok {
		s.mu.Unlock()
		return nil, nil, fmt.Errorf("%w: %s", ErrWidgetNotFound, widgetID)
	}

	sub := newSubscriber()
	group.subscribers[sub] = struct{}{}
	s.mu.Unlock()

	return sub.channel(), func() {
		s.mu.Lock()
		if group, ok := s.groups[widgetID]; ok {
			delete(group.subscribers, sub)
		}
		s.mu.Unlock()
		sub.close()
	}, nil
}

func (s *Service) SnapshotAndSubscribe(widgetID string, from uint64) (Snapshot, <-chan OutputChunk, func(), error) {
	s.mu.Lock()
	group, ok := s.groups[widgetID]
	if !ok {
		s.mu.Unlock()
		return Snapshot{}, nil, nil, fmt.Errorf("%w: %s", ErrWidgetNotFound, widgetID)
	}

	sub := newSubscriber()
	group.subscribers[sub] = struct{}{}
	snapshot, err := snapshotFromGroupLocked(group, from)
	s.mu.Unlock()
	if err != nil {
		sub.close()
		return Snapshot{}, nil, nil, err
	}

	return snapshot, sub.channel(), func() {
		s.mu.Lock()
		if group, ok := s.groups[widgetID]; ok {
			delete(group.subscribers, sub)
		}
		s.mu.Unlock()
		sub.close()
	}, nil
}

func (s *Service) Close() {
	s.mu.Lock()
	groups := s.snapshotGroupsLocked()
	s.groups = make(map[string]*sessionGroup)
	s.starting = make(map[string]*startCall)
	s.mu.Unlock()

	for _, group := range groups {
		s.closeGroupSubscribers(group)
		for _, sessionID := range group.sessionOrder {
			sess := group.sessions[sessionID]
			if sess == nil {
				continue
			}
			if sess.cancel != nil {
				sess.cancel()
			}
			_ = sess.process.Close()
		}
	}
}

func (s *Service) consumeOutput(widgetID string, sessionID string, sess *session) {
	for data := range sess.process.Output() {
		now := time.Now().UTC()
		s.mu.Lock()
		group, ok := s.groups[widgetID]
		if !ok {
			s.mu.Unlock()
			return
		}
		current, ok := group.sessions[sessionID]
		if !ok || current != sess {
			s.mu.Unlock()
			return
		}
		nextSeq := uint64(1)
		if len(sess.chunks) > 0 {
			nextSeq = sess.chunks[len(sess.chunks)-1].Seq + 1
		}
		chunk := OutputChunk{
			Seq:       nextSeq,
			Data:      string(data),
			Timestamp: now,
		}
		sess.chunks = append(sess.chunks, chunk)
		if len(sess.chunks) > maxBufferedChunks {
			sess.chunks = slices.Clone(sess.chunks[len(sess.chunks)-maxBufferedChunks:])
		}
		sess.state.LastOutputAt = &now
		subscribers := []*subscriber(nil)
		if group.activeSessionID == sessionID {
			subscribers = s.snapshotSubscribersLocked(group)
		}
		s.mu.Unlock()

		if len(subscribers) > 0 {
			s.deliverChunk(subscribers, chunk)
		}
	}
}

func (s *Service) waitForExit(widgetID string, sessionID string, sess *session) {
	exitCode, err := sess.process.Wait()
	now := time.Now().UTC()

	s.mu.Lock()
	group, ok := s.groups[widgetID]
	if !ok {
		s.mu.Unlock()
		return
	}
	current, ok := group.sessions[sessionID]
	if !ok || current != sess {
		s.mu.Unlock()
		return
	}
	sess.state.ExitCode = &exitCode
	sess.state.LastOutputAt = &now
	sess.state.CanSendInput = false
	sess.state.CanInterrupt = false
	if err != nil || exitCode != 0 {
		sess.state.Status = StatusFailed
	} else {
		sess.state.Status = StatusExited
	}
	s.mu.Unlock()
	close(sess.exited)
}

func activeGroupStateLocked(group *sessionGroup) (State, error) {
	sess, err := activeGroupSessionLocked(group)
	if err != nil {
		return State{}, err
	}
	return sess.state, nil
}

func activeGroupSessionLocked(group *sessionGroup) (*session, error) {
	sessionID := strings.TrimSpace(group.activeSessionID)
	if sessionID == "" {
		return nil, fmt.Errorf("%w: active session is missing", ErrSessionNotFound)
	}
	sess, ok := group.sessions[sessionID]
	if !ok {
		return nil, fmt.Errorf("%w: %s", ErrSessionNotFound, sessionID)
	}
	return sess, nil
}

func (s *Service) snapshotSubscribersLocked(group *sessionGroup) []*subscriber {
	subscribers := make([]*subscriber, 0, len(group.subscribers))
	for sub := range group.subscribers {
		subscribers = append(subscribers, sub)
	}
	return subscribers
}

func (s *Service) deliverChunk(subscribers []*subscriber, chunk OutputChunk) {
	for _, sub := range subscribers {
		sub.deliver(chunk)
	}
}

func (s *Service) snapshotGroupsLocked() []*sessionGroup {
	groups := make([]*sessionGroup, 0, len(s.groups))
	for _, group := range s.groups {
		groups = append(groups, group)
	}
	return groups
}

func (s *Service) closeGroupSubscribers(group *sessionGroup) {
	s.mu.Lock()
	subscribers := s.snapshotSubscribersLocked(group)
	clear(group.subscribers)
	s.mu.Unlock()

	for _, sub := range subscribers {
		sub.close()
	}
}

func snapshotFromSessionLocked(sess *session, from uint64) Snapshot {
	chunks := make([]OutputChunk, 0, len(sess.chunks))
	for _, chunk := range sess.chunks {
		if chunk.Seq >= from {
			chunks = append(chunks, chunk)
		}
	}
	nextSeq := uint64(1)
	if len(sess.chunks) > 0 {
		nextSeq = sess.chunks[len(sess.chunks)-1].Seq + 1
	}
	return Snapshot{
		State:   sess.state,
		Chunks:  slices.Clone(chunks),
		NextSeq: nextSeq,
	}
}

func snapshotFromGroupLocked(group *sessionGroup, from uint64) (Snapshot, error) {
	activeSession, err := activeGroupSessionLocked(group)
	if err != nil {
		return Snapshot{}, err
	}
	snapshot := snapshotFromSessionLocked(activeSession, from)
	snapshot.ActiveSessionID = group.activeSessionID
	snapshot.Sessions = snapshotSessionStatesLocked(group)
	return snapshot, nil
}

func snapshotSessionStatesLocked(group *sessionGroup) []State {
	states := make([]State, 0, len(group.sessionOrder))
	for _, sessionID := range group.sessionOrder {
		sess, ok := group.sessions[sessionID]
		if !ok {
			continue
		}
		states = append(states, sess.state)
	}
	return slices.Clone(states)
}
