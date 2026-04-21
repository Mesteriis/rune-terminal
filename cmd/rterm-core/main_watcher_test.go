package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestWatcherGracefulShutdownWaitsForWorkerDrain(t *testing.T) {
	t.Parallel()

	var doneCalls atomic.Int64
	backend := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		switch {
		case strings.HasSuffix(request.URL.Path, "/done"):
			doneCalls.Add(1)
			writer.WriteHeader(http.StatusOK)
			_, _ = writer.Write([]byte(`{"status":"ok"}`))
		case strings.HasSuffix(request.URL.Path, "/fail"):
			writer.WriteHeader(http.StatusOK)
			_, _ = writer.Write([]byte(`{"status":"ok"}`))
		default:
			writer.WriteHeader(http.StatusNotFound)
		}
	}))
	defer backend.Close()

	runtime := newWatcherRuntime(backend.URL, "watcher_test", "token", 1, 10*time.Millisecond)
	started := make(chan struct{})
	release := make(chan struct{})
	runtime.taskHandlers["test.block"] = func(ctx context.Context, payload []byte) error {
		close(started)
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-release:
			return nil
		}
	}
	runtime.startWorkers()
	task := watcherTask{ID: "task_1", Type: "test.block", Payload: "{}"}
	runtime.trackPending(task)
	runtime.jobs <- task
	<-started

	shutdownDone := make(chan error, 1)
	shutdownStarted := time.Now()
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		shutdownDone <- runtime.gracefulShutdown(ctx)
	}()

	select {
	case err := <-shutdownDone:
		t.Fatalf("shutdown returned before worker drain completed: %v", err)
	case <-time.After(120 * time.Millisecond):
	}

	close(release)
	if err := <-shutdownDone; err != nil {
		t.Fatalf("graceful shutdown failed: %v", err)
	}
	runtime.stopWorkers()

	if elapsed := time.Since(shutdownStarted); elapsed < 120*time.Millisecond {
		t.Fatalf("shutdown returned too early: %v", elapsed)
	}
	if doneCalls.Load() != 1 {
		t.Fatalf("expected one done call, got %d", doneCalls.Load())
	}
}

func TestWatcherGracefulShutdownFailsLongTaskAndClearsInflight(t *testing.T) {
	t.Parallel()

	var failCalls atomic.Int64
	backend := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		switch {
		case strings.HasSuffix(request.URL.Path, "/done"):
			writer.WriteHeader(http.StatusOK)
			_, _ = writer.Write([]byte(`{"status":"ok"}`))
		case strings.HasSuffix(request.URL.Path, "/fail"):
			failCalls.Add(1)
			writer.WriteHeader(http.StatusOK)
			_, _ = writer.Write([]byte(`{"status":"ok"}`))
		default:
			writer.WriteHeader(http.StatusNotFound)
		}
	}))
	defer backend.Close()

	runtime := newWatcherRuntime(backend.URL, "watcher_test", "token", 1, 10*time.Millisecond)
	runtime.taskHandlers["test.long"] = func(ctx context.Context, payload []byte) error {
		<-ctx.Done()
		return ctx.Err()
	}
	runtime.startWorkers()
	task := watcherTask{ID: "task_long", Type: "test.long", Payload: "{}"}
	runtime.trackPending(task)
	runtime.jobs <- task

	time.Sleep(30 * time.Millisecond)

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 120*time.Millisecond)
	defer cancel()
	if err := runtime.gracefulShutdown(shutdownCtx); err != nil {
		t.Fatalf("graceful shutdown failed: %v", err)
	}
	runtime.stopWorkers()

	if failCalls.Load() == 0 {
		t.Fatal("expected fail call for long-running task")
	}
	if inflight := runtime.inflightCount(); inflight != 0 {
		t.Fatalf("expected no inflight tasks after shutdown, got %d", inflight)
	}
}

func TestWatcherStopsTaskAPICallsAfterTerminalShutdown(t *testing.T) {
	t.Parallel()

	var claimCalls atomic.Int64
	backend := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		switch request.URL.Path {
		case "/api/v1/tasks/claim":
			claimCalls.Add(1)
			writer.WriteHeader(http.StatusOK)
			_, _ = writer.Write([]byte(`{"tasks":[],"count":0}`))
		case "/api/v1/tasks/task_1/done", "/api/v1/tasks/task_1/fail":
			writer.WriteHeader(http.StatusOK)
			_, _ = writer.Write([]byte(`{"status":"ok"}`))
		default:
			writer.WriteHeader(http.StatusNotFound)
		}
	}))
	defer backend.Close()

	runtime := newWatcherRuntime(backend.URL, "watcher_test", "token", 1, 15*time.Millisecond)
	stop := make(chan struct{})
	loopDone := make(chan struct{})
	go func() {
		defer close(loopDone)
		runWatcherRuntime(runtime, stop)
	}()

	deadline := time.Now().Add(500 * time.Millisecond)
	for claimCalls.Load() == 0 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if claimCalls.Load() == 0 {
		t.Fatal("expected watcher to issue claim calls before shutdown")
	}

	close(stop)
	shutdownCtx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := runtime.gracefulShutdown(shutdownCtx); err != nil {
		t.Fatalf("graceful shutdown failed: %v", err)
	}
	runtime.stopWorkers()
	<-loopDone

	afterShutdown := claimCalls.Load()
	time.Sleep(120 * time.Millisecond)
	if claimCalls.Load() != afterShutdown {
		t.Fatalf("unexpected task api calls after terminal shutdown: before=%d after=%d", afterShutdown, claimCalls.Load())
	}
}
