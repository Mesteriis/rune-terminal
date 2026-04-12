package terminal

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

type blockingLauncher struct {
	process chan Process
	calls   atomic.Int32
}

func (l *blockingLauncher) Launch(context.Context, LaunchOptions) (Process, error) {
	l.calls.Add(1)
	return <-l.process, nil
}

func TestStartSessionCoalescesConcurrentLaunches(t *testing.T) {
	t.Parallel()

	launcher := &blockingLauncher{process: make(chan Process)}
	service := NewService(launcher)
	process := &fakeProcess{
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
	}

	results := make(chan State, 8)
	errs := make(chan error, 8)

	go func() {
		launcher.process <- process
	}()

	var wg sync.WaitGroup
	for range 8 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			state, err := service.StartSession(context.Background(), LaunchOptions{WidgetID: "term-main", Shell: "/bin/sh"})
			if err != nil {
				errs <- err
				return
			}
			results <- state
		}()
	}
	wg.Wait()
	close(results)
	close(errs)
	defer service.Close()

	for err := range errs {
		t.Fatalf("unexpected StartSession error: %v", err)
	}
	if calls := launcher.calls.Load(); calls != 1 {
		t.Fatalf("expected exactly one launch, got %d", calls)
	}

	var first State
	for state := range results {
		if first.WidgetID == "" {
			first = state
			continue
		}
		if state.SessionID != first.SessionID || state.PID != first.PID {
			t.Fatalf("expected shared session state, got %#v and %#v", first, state)
		}
	}
}

func TestUnsubscribeIsSafeDuringConcurrentDelivery(t *testing.T) {
	t.Parallel()

	process := &fakeProcess{
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
	}
	service := NewService(fakeLauncher{process: process})
	if _, err := service.StartSession(context.Background(), LaunchOptions{WidgetID: "term-main", Shell: "/bin/sh"}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}
	defer service.Close()

	service.mu.RLock()
	sess := service.sessions["term-main"]
	service.mu.RUnlock()

	for i := range 128 {
		ch, unsubscribe, err := service.Subscribe("term-main")
		if err != nil {
			t.Fatalf("Subscribe error: %v", err)
		}

		service.mu.Lock()
		snapshot := service.snapshotSubscribersLocked(sess)
		service.mu.Unlock()

		var wg sync.WaitGroup
		wg.Add(2)
		go func(seq int) {
			defer wg.Done()
			service.deliverChunk(snapshot, OutputChunk{Seq: uint64(seq + 1), Data: "chunk"})
		}(i)
		go func() {
			defer wg.Done()
			unsubscribe()
		}()
		wg.Wait()

		select {
		case _, ok := <-ch:
			if ok {
				select {
				case _, stillOpen := <-ch:
					if stillOpen {
						t.Fatalf("expected subscriber channel to close after unsubscribe")
					}
				case <-time.After(100 * time.Millisecond):
					t.Fatalf("subscriber channel did not close")
				}
			}
		case <-time.After(100 * time.Millisecond):
			t.Fatalf("subscriber channel did not close")
		}
	}
}
