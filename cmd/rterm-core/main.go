package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/Mesteriis/rune-terminal/core/app"
	"github.com/Mesteriis/rune-terminal/core/transport/httpapi"
)

func main() {
	if len(os.Args) < 2 || os.Args[1] != "serve" {
		fmt.Fprintf(os.Stderr, "usage: %s serve [flags]\n", filepath.Base(os.Args[0]))
		os.Exit(2)
	}
	if err := serve(os.Args[2:]); err != nil {
		fmt.Fprintf(os.Stderr, "rterm-core error: %v\n", err)
		os.Exit(1)
	}
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
