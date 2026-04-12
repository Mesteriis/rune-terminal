package terminal

import "sync"

type subscriber struct {
	ch     chan OutputChunk
	mu     sync.Mutex
	closed bool
	once   sync.Once
}

func newSubscriber() *subscriber {
	return &subscriber{ch: make(chan OutputChunk, 32)}
}

func (s *subscriber) channel() <-chan OutputChunk {
	return s.ch
}

func (s *subscriber) deliver(chunk OutputChunk) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		return
	}
	select {
	case s.ch <- chunk:
	default:
	}
}

func (s *subscriber) close() {
	s.once.Do(func() {
		s.mu.Lock()
		defer s.mu.Unlock()
		if s.closed {
			return
		}
		s.closed = true
		close(s.ch)
	})
}
