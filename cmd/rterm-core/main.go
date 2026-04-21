package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"path/filepath"
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
	BackendURL string `json:"backend_url"`
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
	if err := flags.Parse(args); err != nil {
		return err
	}
	if *backendURL == "" {
		return fmt.Errorf("--backend is required")
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
	mux.HandleFunc("GET /watcher/state", func(writer http.ResponseWriter, _ *http.Request) {
		writeJSONResponse(writer, watcherState{BackendURL: *backendURL})
	})
	baseURL := "http://" + listener.Addr().String()
	fmt.Printf(`{"base_url":"%s","pid":%d}`+"\n", baseURL, os.Getpid())

	pollDone := make(chan struct{})
	stopPoll := func() {
		select {
		case <-pollDone:
		default:
			close(pollDone)
		}
	}
	defer stopPoll()
	go func() {
		pollBackendHealth(*backendURL, pollDone)
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
		_ = gracefulWatcherShutdown(shutdownCtx, *backendURL)
		return httpapi.Shutdown(shutdownCtx, server)
	case err := <-serverErr:
		if err == nil || err == http.ErrServerClosed {
			return nil
		}
		return err
	}
}

func gracefulWatcherShutdown(ctx context.Context, backendURL string) error {
	deadline, hasDeadline := ctx.Deadline()
	for {
		if !hasDeadline && ctx.Err() != nil {
			return nil
		}
		active, err := fetchActiveTaskCount(backendURL)
		if err != nil {
			return err
		}
		if active == 0 {
			return nil
		}
		remaining := time.Until(deadline)
		if hasDeadline && remaining <= 0 {
			_, err := markActiveTasksFailed(backendURL, "watcher shutdown timeout")
			if err != nil {
				return err
			}
			return nil
		}
		time.Sleep(500 * time.Millisecond)
	}
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

func fetchActiveTaskCount(baseURL string) (int, error) {
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get(baseURL + "/tasks/active") // #nosec G107
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("active tasks request failed: %s", resp.Status)
	}

	var payload struct {
		Count int `json:"count"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return 0, err
	}
	return payload.Count, nil
}

func markActiveTasksFailed(baseURL, reason string) (int, error) {
	client := &http.Client{Timeout: 2 * time.Second}
	request, err := http.NewRequest(http.MethodPost, baseURL+"/tasks/active/mark-failed?reason="+urlEscape(reason), nil)
	if err != nil {
		return 0, err
	}
	resp, err := client.Do(request)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("mark failed request failed: %s", resp.Status)
	}
	var payload struct {
		Marked int `json:"marked"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return 0, err
	}
	return payload.Marked, nil
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

func urlEscape(value string) string {
	return url.QueryEscape(strings.TrimSpace(value))
}
