package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/Mesteriis/rune-terminal/core/app"
	"github.com/Mesteriis/rune-terminal/core/transport/httpapi"
	pluginexample "github.com/Mesteriis/rune-terminal/plugins/example"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintf(os.Stderr, "usage: %s <serve|watcher|plugin-example> [flags]\n", filepath.Base(os.Args[0]))
		os.Exit(2)
	}

	var err error
	switch os.Args[1] {
	case "serve":
		err = serve(os.Args[2:])
	case "watcher":
		err = runWatcher(os.Args[2:])
	case "plugin-example":
		err = runExamplePlugin()
	default:
		fmt.Fprintf(os.Stderr, "usage: %s <serve|watcher|plugin-example> [flags]\n", filepath.Base(os.Args[0]))
		os.Exit(2)
	}
	if err != nil {
		fmt.Fprintf(os.Stderr, "rterm-core error: %v\n", err)
		os.Exit(1)
	}
}

func runExamplePlugin() error {
	return pluginexample.Run(os.Stdin, os.Stdout)
}

type healthPayload struct {
	Service string `json:"service"`
	Status  string `json:"status"`
	PID     int    `json:"pid"`
}

type watcherState struct {
	BackendURL    string `json:"backend_url"`
	WorkerID      string `json:"worker_id"`
	ShutdownToken string `json:"shutdown_token"`
}

type handlerFunc func(context.Context, []byte) error

type watcherTask struct {
	ID      string `json:"id"`
	Type    string `json:"type"`
	Payload string `json:"payload"`
}

type claimTasksRequest struct {
	WorkerID string `json:"worker_id"`
	Limit    int    `json:"limit"`
}

type claimTasksResponse struct {
	Tasks []watcherTask `json:"tasks"`
	Count int           `json:"count"`
}

type markDoneRequest struct {
	WorkerID string `json:"worker_id"`
}

type markFailRequest struct {
	WorkerID string `json:"worker_id"`
	Error    string `json:"error"`
}

type watcherRuntime struct {
	client        *http.Client
	backendURL    string
	workerID      string
	shutdownToken string
	pollInterval  time.Duration
	workers       int
	authToken     string
	taskHandlers  map[string]handlerFunc

	jobs        chan watcherTask
	pollDone    chan struct{}
	workerGroup sync.WaitGroup

	pendingMu sync.Mutex
	pending   map[string]watcherTask

	runningMu sync.Mutex
	running   map[string]context.CancelFunc

	stopPolling atomic.Bool
	abortTasks  atomic.Bool
	closeJobs   sync.Once
}

func serve(args []string) error {
	flags := flag.NewFlagSet("serve", flag.ContinueOnError)
	listen := flags.String("listen", "127.0.0.1:0", "listen address")
	stateDir := flags.String("state-dir", "./state", "state directory")
	workspaceRoot := flags.String("workspace-root", ".", "workspace root")
	readyFile := flags.String("ready-file", "", "path to write runtime readiness info")
	if err := flags.Parse(args); err != nil {
		return err
	}

	repoRoot, err := filepath.Abs(*workspaceRoot)
	if err != nil {
		return err
	}
	resolvedStateDir, err := filepath.Abs(*stateDir)
	if err != nil {
		return err
	}

	runtime, err := app.NewRuntime(repoRoot, resolvedStateDir)
	if err != nil {
		return err
	}
	defer runtime.Terminals.Close()

	handler := httpapi.NewHandler(runtime, os.Getenv("RTERM_AUTH_TOKEN"))
	server := &http.Server{
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	listener, err := net.Listen("tcp", *listen)
	if err != nil {
		return err
	}
	baseURL := "http://" + listener.Addr().String()

	ready := map[string]any{
		"base_url": baseURL,
		"pid":      os.Getpid(),
	}
	if *readyFile != "" {
		payload, _ := json.Marshal(ready)
		if err := os.WriteFile(*readyFile, payload, 0o600); err != nil {
			return err
		}
	}
	if payload, err := json.Marshal(ready); err == nil {
		fmt.Println(string(payload))
	}

	errCh := make(chan error, 1)
	go func() {
		errCh <- server.Serve(listener)
	}()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return httpapi.Shutdown(shutdownCtx, server)
	case err := <-errCh:
		if err == nil || err == http.ErrServerClosed {
			return nil
		}
		return err
	}
}

func runWatcher(args []string) error {
	flags := flag.NewFlagSet("watcher", flag.ContinueOnError)
	backendURL := flags.String("backend", "", "core backend base URL")
	listen := flags.String("listen", "127.0.0.1:7788", "listen address")
	workerID := flags.String("worker-id", "", "watcher worker identity")
	shutdownToken := flags.String("shutdown-token", "", "token used by desktop to request graceful shutdown")
	pollInterval := flags.Duration("poll-interval", time.Second, "task poll interval")
	workers := flags.Int("workers", 4, "number of concurrent task workers")
	if err := flags.Parse(args); err != nil {
		return err
	}
	if *backendURL == "" {
		return fmt.Errorf("--backend is required")
	}
	if *workerID == "" {
		return fmt.Errorf("--worker-id is required")
	}
	if *shutdownToken == "" {
		return fmt.Errorf("--shutdown-token is required")
	}
	if *workers <= 0 {
		return fmt.Errorf("--workers must be positive")
	}
	if *pollInterval <= 0 {
		return fmt.Errorf("--poll-interval must be positive")
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(writer http.ResponseWriter, _ *http.Request) {
		writeJSONResponse(writer, map[string]any{
			"service": "rterm-watcher",
			"status":  "ok",
			"pid":     os.Getpid(),
		})
	})
	server := &http.Server{
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	listener, err := net.Listen("tcp", *listen)
	if err != nil {
		return err
	}

	runtime := newWatcherRuntime(*backendURL, *workerID, *shutdownToken, *workers, *pollInterval)
	runtime.registerDefaultHandlers()
	pollDone := make(chan struct{})
	var stopPollingOnce sync.Once
	stopPollingSignal := func() {
		stopPollingOnce.Do(func() {
			close(pollDone)
		})
	}

	mux.HandleFunc("GET /watcher/state", func(writer http.ResponseWriter, _ *http.Request) {
		writeJSONResponse(writer, watcherState{
			BackendURL:    *backendURL,
			WorkerID:      *workerID,
			ShutdownToken: *shutdownToken,
		})
	})
	mux.HandleFunc("POST /watcher/shutdown", func(writer http.ResponseWriter, request *http.Request) {
		if request.Method != http.MethodPost {
			writer.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		if request.URL.Query().Get("worker_id") != *workerID {
			writer.WriteHeader(http.StatusUnauthorized)
			return
		}
		if request.URL.Query().Get("token") != *shutdownToken {
			writer.WriteHeader(http.StatusUnauthorized)
			return
		}

		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		stopPollingSignal()
		if err := runtime.gracefulShutdown(shutdownCtx); err != nil {
			writeJSONError(writer, err)
			return
		}
		runtime.stopWorkers()
		writeJSONResponse(writer, map[string]any{"phase": "stopped", "status": "ok"})
		go func() {
			serverShutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer shutdownCancel()
			_ = httpapi.Shutdown(serverShutdownCtx, server)
		}()
	})
	baseURL := "http://" + listener.Addr().String()
	fmt.Printf(`{"base_url":"%s","pid":%d}`+"\n", baseURL, os.Getpid())
	go func() {
		pollBackendHealth(*backendURL, pollDone)
	}()
	go func() {
		runWatcherRuntime(runtime, pollDone)
	}()

	serverErr := make(chan error, 1)
	go func() {
		serverErr <- server.Serve(listener)
	}()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		stopPollingSignal()
		_ = runtime.gracefulShutdown(shutdownCtx)
		runtime.stopWorkers()
		return httpapi.Shutdown(shutdownCtx, server)
	case err := <-serverErr:
		if err == nil || err == http.ErrServerClosed {
			return nil
		}
		return err
	}
}

func runWatcherRuntime(runtime *watcherRuntime, stop <-chan struct{}) {
	runtime.startWorkers()
	ticker := time.NewTicker(runtime.pollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-stop:
			runtime.stopPolling.Store(true)
			return
		case <-ticker.C:
			if runtime.stopPolling.Load() {
				return
			}
			if err := runtime.pollOnce(context.Background()); err != nil {
				fmt.Fprintf(os.Stderr, "watcher: task poll failed: %v\n", err)
			}
		}
	}
}

func newWatcherRuntime(backendURL, workerID, shutdownToken string, workers int, pollInterval time.Duration) *watcherRuntime {
	authToken := os.Getenv("RTERM_BACKEND_AUTH_TOKEN")
	if authToken == "" {
		authToken = os.Getenv("RTERM_AUTH_TOKEN")
	}
	return &watcherRuntime{
		client:        &http.Client{Timeout: 5 * time.Second},
		backendURL:    strings.TrimRight(backendURL, "/"),
		workerID:      workerID,
		shutdownToken: shutdownToken,
		pollInterval:  pollInterval,
		workers:       workers,
		authToken:     strings.TrimSpace(authToken),
		taskHandlers:  make(map[string]handlerFunc),
		jobs:          make(chan watcherTask, workers*4),
		pending:       make(map[string]watcherTask),
		running:       make(map[string]context.CancelFunc),
	}
}

func (runtime *watcherRuntime) registerDefaultHandlers() {
	runtime.taskHandlers["example.sleep"] = func(ctx context.Context, payload []byte) error {
		var request struct {
			DurationMS int `json:"duration_ms"`
		}
		if err := json.Unmarshal(payload, &request); err != nil {
			return fmt.Errorf("invalid example.sleep payload: %w", err)
		}
		if request.DurationMS < 0 {
			return fmt.Errorf("duration_ms must be >= 0")
		}
		timer := time.NewTimer(time.Duration(request.DurationMS) * time.Millisecond)
		defer timer.Stop()

		select {
		case <-ctx.Done():
			return fmt.Errorf("task canceled: %w", ctx.Err())
		case <-timer.C:
			return nil
		}
	}
}

func (runtime *watcherRuntime) pollOnce(ctx context.Context) error {
	claimed, err := runtime.claimTasks(ctx, runtime.workers)
	if err != nil {
		return err
	}
	for _, task := range claimed {
		if runtime.stopPolling.Load() {
			_ = runtime.markTaskFailed(ctx, task.ID, "watcher shutting down")
			continue
		}
		runtime.trackPending(task)
		select {
		case runtime.jobs <- task:
		default:
			runtime.untrackPending(task.ID)
			_ = runtime.markTaskFailed(ctx, task.ID, "watcher queue overflow")
		}
	}
	return nil
}

func (runtime *watcherRuntime) startWorkers() {
	for index := 0; index < runtime.workers; index++ {
		runtime.workerGroup.Add(1)
		go runtime.workerLoop()
	}
}

func (runtime *watcherRuntime) stopWorkers() {
	runtime.workerGroup.Wait()
}

func (runtime *watcherRuntime) workerLoop() {
	defer runtime.workerGroup.Done()
	for task := range runtime.jobs {
		runtime.executeTask(task)
	}
}

func (runtime *watcherRuntime) executeTask(task watcherTask) {
	if runtime.abortTasks.Load() {
		runtime.untrackPending(task.ID)
		_ = runtime.markTaskFailed(context.Background(), task.ID, "watcher shutdown timeout")
		return
	}

	handler, ok := runtime.taskHandlers[task.Type]
	if !ok {
		runtime.untrackPending(task.ID)
		_ = runtime.markTaskFailed(context.Background(), task.ID, "unsupported task type: "+task.Type)
		return
	}

	ctx, cancel := context.WithCancel(context.Background())
	runtime.trackRunning(task.ID, cancel)
	runtime.untrackPending(task.ID)
	defer func() {
		cancel()
		runtime.untrackRunning(task.ID)
	}()

	payloadBytes := []byte(strings.TrimSpace(task.Payload))
	if len(payloadBytes) == 0 {
		payloadBytes = []byte("{}")
	}

	err := handler(ctx, payloadBytes)
	if err != nil {
		_ = runtime.markTaskFailed(context.Background(), task.ID, err.Error())
		return
	}
	_ = runtime.markTaskDone(context.Background(), task.ID)
}

func (runtime *watcherRuntime) gracefulShutdown(ctx context.Context) error {
	runtime.stopPolling.Store(true)

	for {
		if runtime.inflightCount() == 0 {
			runtime.closeTaskQueue()
			return nil
		}
		if ctx.Err() != nil {
			break
		}
		time.Sleep(100 * time.Millisecond)
	}

	runtime.abortTasks.Store(true)
	runtime.cancelRunning()

	var combinedErr error
	for _, taskID := range runtime.snapshotInflightTaskIDs() {
		err := runtime.markTaskFailed(context.Background(), taskID, "watcher shutdown timeout")
		if err != nil && !isTaskFinalizationConflict(err) {
			combinedErr = errors.Join(combinedErr, err)
		}
		runtime.untrackPending(taskID)
		runtime.untrackRunning(taskID)
	}

	runtime.closeTaskQueue()
	return combinedErr
}

func (runtime *watcherRuntime) closeTaskQueue() {
	runtime.closeJobs.Do(func() {
		close(runtime.jobs)
	})
}

func (runtime *watcherRuntime) inflightCount() int {
	runtime.pendingMu.Lock()
	pendingCount := len(runtime.pending)
	runtime.pendingMu.Unlock()

	runtime.runningMu.Lock()
	runningCount := len(runtime.running)
	runtime.runningMu.Unlock()

	return pendingCount + runningCount
}

func (runtime *watcherRuntime) snapshotInflightTaskIDs() []string {
	ids := make(map[string]struct{})

	runtime.pendingMu.Lock()
	for id := range runtime.pending {
		ids[id] = struct{}{}
	}
	runtime.pendingMu.Unlock()

	runtime.runningMu.Lock()
	for id := range runtime.running {
		ids[id] = struct{}{}
	}
	runtime.runningMu.Unlock()

	result := make([]string, 0, len(ids))
	for id := range ids {
		result = append(result, id)
	}
	return result
}

func (runtime *watcherRuntime) cancelRunning() {
	runtime.runningMu.Lock()
	defer runtime.runningMu.Unlock()
	for _, cancel := range runtime.running {
		cancel()
	}
}

func (runtime *watcherRuntime) trackPending(task watcherTask) {
	runtime.pendingMu.Lock()
	defer runtime.pendingMu.Unlock()
	runtime.pending[task.ID] = task
}

func (runtime *watcherRuntime) untrackPending(taskID string) {
	runtime.pendingMu.Lock()
	defer runtime.pendingMu.Unlock()
	delete(runtime.pending, taskID)
}

func (runtime *watcherRuntime) trackRunning(taskID string, cancel context.CancelFunc) {
	runtime.runningMu.Lock()
	defer runtime.runningMu.Unlock()
	runtime.running[taskID] = cancel
}

func (runtime *watcherRuntime) untrackRunning(taskID string) {
	runtime.runningMu.Lock()
	defer runtime.runningMu.Unlock()
	delete(runtime.running, taskID)
}

func (runtime *watcherRuntime) claimTasks(ctx context.Context, limit int) ([]watcherTask, error) {
	request := claimTasksRequest{
		WorkerID: runtime.workerID,
		Limit:    limit,
	}
	var response claimTasksResponse
	if err := runtime.requestJSON(ctx, http.MethodPost, "/api/v1/tasks/claim", request, &response); err != nil {
		return nil, err
	}
	return response.Tasks, nil
}

func (runtime *watcherRuntime) markTaskDone(ctx context.Context, taskID string) error {
	request := markDoneRequest{WorkerID: runtime.workerID}
	return runtime.requestJSON(ctx, http.MethodPost, "/api/v1/tasks/"+taskID+"/done", request, nil)
}

func (runtime *watcherRuntime) markTaskFailed(ctx context.Context, taskID string, reason string) error {
	request := markFailRequest{
		WorkerID: runtime.workerID,
		Error:    strings.TrimSpace(reason),
	}
	if request.Error == "" {
		request.Error = "watcher task failed"
	}
	return runtime.requestJSON(ctx, http.MethodPost, "/api/v1/tasks/"+taskID+"/fail", request, nil)
}

func (runtime *watcherRuntime) requestJSON(ctx context.Context, method string, path string, requestBody any, responseBody any) error {
	var bodyReader io.Reader
	if requestBody != nil {
		encoded, err := json.Marshal(requestBody)
		if err != nil {
			return err
		}
		bodyReader = strings.NewReader(string(encoded))
	}

	request, err := http.NewRequestWithContext(ctx, method, runtime.backendURL+path, bodyReader)
	if err != nil {
		return err
	}
	if requestBody != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	if runtime.authToken != "" {
		request.Header.Set("Authorization", "Bearer "+runtime.authToken)
	}

	response, err := runtime.client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		payload := make(map[string]any)
		_ = json.NewDecoder(response.Body).Decode(&payload)
		return fmt.Errorf("task api request failed: method=%s path=%s status=%d payload=%v", method, path, response.StatusCode, payload)
	}
	if responseBody == nil {
		return nil
	}
	return json.NewDecoder(response.Body).Decode(responseBody)
}

func isTaskFinalizationConflict(err error) bool {
	if err == nil {
		return false
	}
	message := err.Error()
	return strings.Contains(message, "status=404") || strings.Contains(message, "status=409")
}

func pollBackendHealth(backendURL string, stop <-chan struct{}) {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			_, err := readHealth(backendURL + "/api/v1/health")
			if err != nil {
				fmt.Fprintf(os.Stderr, "watcher: backend health check failed: %v\n", err)
			}
		case <-stop:
			return
		}
	}
}

func readHealth(url string) (healthPayload, error) {
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get(url) // #nosec G107
	if err != nil {
		return healthPayload{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return healthPayload{}, fmt.Errorf("health request failed: %s", resp.Status)
	}

	var payload healthPayload
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return healthPayload{}, err
	}
	if payload.Status != "ok" {
		return healthPayload{}, fmt.Errorf("unhealthy status: %q", payload.Status)
	}
	if payload.PID <= 0 {
		return healthPayload{}, fmt.Errorf("invalid pid")
	}
	return payload, nil
}

func writeJSONResponse(writer http.ResponseWriter, payload any) {
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		writeJSONError(writer, err)
		return
	}
	writer.Header().Set("Content-Type", "application/json")
	_, err = writer.Write(payloadBytes)
	if err != nil {
		panic(err)
	}
}

func writeJSONError(writer http.ResponseWriter, err error) {
	writer.Header().Set("Content-Type", "application/json")
	_, _ = writer.Write([]byte(`{"error":"` + err.Error() + `"}`))
}
