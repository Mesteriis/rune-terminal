package terminal

import (
	"context"
	"errors"
	"fmt"
	"os"
	"slices"
	"sync"
	"time"
)

const maxBufferedChunks = 512

type session struct {
	state       State
	process     Process
	chunks      []OutputChunk
	subscribers map[*subscriber]struct{}
}

type Service struct {
	mu       sync.RWMutex
	launcher Launcher
	sessions map[string]*session
	starting map[string]*startCall
}

func NewService(launcher Launcher) *Service {
	return &Service{
		launcher: launcher,
		sessions: make(map[string]*session),
		starting: make(map[string]*startCall),
	}
}

func (s *Service) StartSession(ctx context.Context, opts LaunchOptions) (State, error) {
	if opts.WidgetID == "" {
		return State{}, errors.New("widget id is required")
	}
	if opts.Shell == "" {
		opts.Shell = DefaultShell()
	}

	s.mu.Lock()
	if existing, ok := s.sessions[opts.WidgetID]; ok {
		state := existing.state
		s.mu.Unlock()
		return state, nil
	}
	if pending, ok := s.starting[opts.WidgetID]; ok {
		s.mu.Unlock()
		return pending.wait(ctx)
	}
	pending := newStartCall()
	s.starting[opts.WidgetID] = pending
	s.mu.Unlock()

	process, err := s.launcher.Launch(ctx, opts)
	if err != nil {
		s.mu.Lock()
		delete(s.starting, opts.WidgetID)
		pending.finish(State{}, err)
		s.mu.Unlock()
		return State{}, err
	}

	state := State{
		WidgetID:     opts.WidgetID,
		SessionID:    opts.WidgetID,
		Shell:        opts.Shell,
		PID:          process.PID(),
		Status:       StatusRunning,
		StartedAt:    time.Now().UTC(),
		CanSendInput: true,
		CanInterrupt: true,
		WorkingDir:   opts.WorkingDir,
	}

	sess := &session{
		state:       state,
		process:     process,
		subscribers: make(map[*subscriber]struct{}),
	}

	s.mu.Lock()
	s.sessions[opts.WidgetID] = sess
	delete(s.starting, opts.WidgetID)
	pending.finish(state, nil)
	s.mu.Unlock()

	go s.consumeOutput(opts.WidgetID, sess)
	go s.waitForExit(opts.WidgetID, sess)

	return state, nil
}

func (s *Service) GetState(widgetID string) (State, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	sess, ok := s.sessions[widgetID]
	if !ok {
		return State{}, fmt.Errorf("%w: %s", ErrWidgetNotFound, widgetID)
	}
	return sess.state, nil
}

func (s *Service) SendInput(widgetID string, text string, appendNewline bool) (InputResult, error) {
	s.mu.RLock()
	sess, ok := s.sessions[widgetID]
	s.mu.RUnlock()
	if !ok {
		return InputResult{}, fmt.Errorf("%w: %s", ErrWidgetNotFound, widgetID)
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
	sess, ok := s.sessions[widgetID]
	s.mu.RUnlock()
	if !ok {
		return fmt.Errorf("%w: %s", ErrWidgetNotFound, widgetID)
	}
	if !sess.state.CanInterrupt {
		return fmt.Errorf("%w: %s", ErrCannotInterrupt, widgetID)
	}
	return sess.process.Signal(os.Interrupt)
}

func (s *Service) CloseSession(widgetID string) error {
	s.mu.Lock()
	sess, ok := s.sessions[widgetID]
	if !ok {
		s.mu.Unlock()
		return fmt.Errorf("%w: %s", ErrWidgetNotFound, widgetID)
	}
	delete(s.sessions, widgetID)
	s.mu.Unlock()

	s.closeSubscribers(sess)
	return sess.process.Close()
}

func (s *Service) Snapshot(widgetID string, from uint64) (Snapshot, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	sess, ok := s.sessions[widgetID]
	if !ok {
		return Snapshot{}, fmt.Errorf("%w: %s", ErrWidgetNotFound, widgetID)
	}

	var chunks []OutputChunk
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
	}, nil
}

func (s *Service) Subscribe(widgetID string) (<-chan OutputChunk, func(), error) {
	s.mu.Lock()
	sess, ok := s.sessions[widgetID]
	if !ok {
		s.mu.Unlock()
		return nil, nil, fmt.Errorf("%w: %s", ErrWidgetNotFound, widgetID)
	}

	sub := newSubscriber()
	sess.subscribers[sub] = struct{}{}
	s.mu.Unlock()

	return sub.channel(), func() {
		s.mu.Lock()
		if sess, ok := s.sessions[widgetID]; ok {
			delete(sess.subscribers, sub)
		}
		s.mu.Unlock()
		sub.close()
	}, nil
}

func (s *Service) Close() {
	s.mu.Lock()
	sessions := s.snapshotSessionsLocked()
	s.sessions = make(map[string]*session)
	s.starting = make(map[string]*startCall)
	s.mu.Unlock()

	for _, sess := range sessions {
		s.closeSubscribers(sess)
		_ = sess.process.Close()
	}
}

func (s *Service) consumeOutput(widgetID string, sess *session) {
	for data := range sess.process.Output() {
		now := time.Now().UTC()
		s.mu.Lock()
		current, ok := s.sessions[widgetID]
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
		subscribers := s.snapshotSubscribersLocked(sess)
		s.mu.Unlock()

		s.deliverChunk(subscribers, chunk)
	}
}

func (s *Service) waitForExit(widgetID string, sess *session) {
	exitCode, err := sess.process.Wait()
	now := time.Now().UTC()

	s.mu.Lock()
	current, ok := s.sessions[widgetID]
	if !ok || current != sess {
		s.mu.Unlock()
		return
	}
	sess.state.ExitCode = &exitCode
	sess.state.LastOutputAt = &now
	sess.state.CanSendInput = false
	sess.state.CanInterrupt = false
	if err != nil {
		sess.state.Status = StatusFailed
	} else {
		sess.state.Status = StatusExited
	}
	subscribers := s.snapshotSubscribersLocked(sess)
	clear(sess.subscribers)
	s.mu.Unlock()

	for _, sub := range subscribers {
		sub.close()
	}
}

func (s *Service) snapshotSubscribersLocked(sess *session) []*subscriber {
	subscribers := make([]*subscriber, 0, len(sess.subscribers))
	for sub := range sess.subscribers {
		subscribers = append(subscribers, sub)
	}
	return subscribers
}

func (s *Service) deliverChunk(subscribers []*subscriber, chunk OutputChunk) {
	for _, sub := range subscribers {
		sub.deliver(chunk)
	}
}

func (s *Service) snapshotSessionsLocked() []*session {
	sessions := make([]*session, 0, len(s.sessions))
	for _, sess := range s.sessions {
		sessions = append(sessions, sess)
	}
	return sessions
}

func (s *Service) closeSubscribers(sess *session) {
	s.mu.Lock()
	subscribers := s.snapshotSubscribersLocked(sess)
	clear(sess.subscribers)
	s.mu.Unlock()

	for _, sub := range subscribers {
		sub.close()
	}
}
