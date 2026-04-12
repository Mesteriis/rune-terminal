package terminal

import "context"

type startCall struct {
	done  chan struct{}
	state State
	err   error
}

func newStartCall() *startCall {
	return &startCall{done: make(chan struct{})}
}

func (c *startCall) finish(state State, err error) {
	c.state = state
	c.err = err
	close(c.done)
}

func (c *startCall) wait(ctx context.Context) (State, error) {
	select {
	case <-ctx.Done():
		return State{}, ctx.Err()
	case <-c.done:
		return c.state, c.err
	}
}
