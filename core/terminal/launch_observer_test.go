package terminal

import (
	"context"
	"testing"
	"time"
)

func TestObserveLaunchReturnsSuccessAfterOutput(t *testing.T) {
	t.Parallel()

	process := &fakeProcess{
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
	}
	service := NewService(fakeLauncher{process: process})
	if _, err := service.StartSession(context.Background(), LaunchOptions{WidgetID: "term-main", Shell: "/bin/sh"}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}

	process.outputCh <- []byte("ready\n")

	state, err := service.ObserveLaunch(context.Background(), "term-main", 500*time.Millisecond)
	if err != nil {
		t.Fatalf("ObserveLaunch error: %v", err)
	}
	if state.Status != StatusRunning {
		t.Fatalf("expected running status, got %s", state.Status)
	}
}

func TestObserveLaunchReturnsFailureOnEarlyExit(t *testing.T) {
	t.Parallel()

	process := &fakeProcess{
		outputCh: make(chan []byte, 1),
		waitCh:   make(chan struct{}),
		exitCode: 255,
	}
	service := NewService(fakeLauncher{process: process})
	if _, err := service.StartSession(context.Background(), LaunchOptions{WidgetID: "term-main", Shell: "/bin/sh"}); err != nil {
		t.Fatalf("StartSession error: %v", err)
	}

	process.outputCh <- []byte("Permission denied\n")
	close(process.outputCh)
	close(process.waitCh)

	_, err := service.ObserveLaunch(context.Background(), "term-main", 500*time.Millisecond)
	if err == nil {
		t.Fatalf("expected ObserveLaunch to fail")
	}
}
