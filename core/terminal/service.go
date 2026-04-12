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
	subscribers map[chan OutputChunk]struct{}
}

type Service struct {
	mu       sync.RWMutex
	launcher Launcher
	sessions map[string]*session
}

func NewService(launcher Launcher) *Service {
	return &Service{
		launcher: launcher,
		sessions: make(map[string]*session),
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
	s.mu.Unlock()

	process, err := s.launcher.Launch(ctx, opts)
	if err != nil {
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
		subscribers: make(map[chan OutputChunk]struct{}),
	}

	s.mu.Lock()
	s.sessions[opts.WidgetID] = sess
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
	defer s.mu.Unlock()

	sess, ok := s.sessions[widgetID]
	if !ok {
		return nil, nil, fmt.Errorf("%w: %s", ErrWidgetNotFound, widgetID)
	}

	ch := make(chan OutputChunk, 32)
	sess.subscribers[ch] = struct{}{}
	return ch, func() {
		s.mu.Lock()
		defer s.mu.Unlock()
		if sess, ok := s.sessions[widgetID]; ok {
			delete(sess.subscribers, ch)
		}
		close(ch)
	}, nil
}

func (s *Service) Close() {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, sess := range s.sessions {
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
		subscribers := make([]chan OutputChunk, 0, len(sess.subscribers))
		for subscriber := range sess.subscribers {
			subscribers = append(subscribers, subscriber)
		}
		s.mu.Unlock()

		for _, subscriber := range subscribers {
			select {
			case subscriber <- chunk:
			default:
			}
		}
	}
}

func (s *Service) waitForExit(widgetID string, sess *session) {
	exitCode, err := sess.process.Wait()
	now := time.Now().UTC()

	s.mu.Lock()
	defer s.mu.Unlock()
	current, ok := s.sessions[widgetID]
	if !ok || current != sess {
		return
	}
	sess.state.ExitCode = &exitCode
	sess.state.LastOutputAt = &now
	sess.state.CanSendInput = false
	sess.state.CanInterrupt = false
	if err != nil {
		sess.state.Status = StatusFailed
		return
	}
	sess.state.Status = StatusExited
}
