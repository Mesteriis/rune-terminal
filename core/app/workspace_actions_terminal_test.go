package app

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/terminal"
	"github.com/Mesteriis/rune-terminal/core/workspace"
)

func TestCreateSplitTerminalWidgetUsesRequestedWorkingDir(t *testing.T) {
	t.Parallel()

	process := &launchTestProcess{
		pid:      300,
		outputCh: make(chan []byte),
		waitCh:   make(chan struct{}),
		exitCode: 0,
	}
	launcher := &queueLaunchOptions{
		processes: []terminal.Process{process},
	}
	runtime := newRestartRuntime(t, launcher)
	workingDir := filepath.Join(runtime.RepoRoot, "docs")
	if err := os.MkdirAll(workingDir, 0o755); err != nil {
		t.Fatalf("MkdirAll error: %v", err)
	}

	result, err := runtime.CreateSplitTerminalWidget(
		context.Background(),
		"Shell here",
		"tab-main",
		"term-main",
		workspace.WindowSplitRight,
		"local",
		workingDir,
	)
	if err != nil {
		t.Fatalf("CreateSplitTerminalWidget error: %v", err)
	}
	if result.WidgetID == "" {
		t.Fatalf("expected created widget id")
	}

	options := launcher.launchedOptions()
	if len(options) != 1 {
		t.Fatalf("expected 1 launch call, got %d", len(options))
	}
	if options[0].WorkingDir != workingDir {
		t.Fatalf("expected working dir %q, got %q", workingDir, options[0].WorkingDir)
	}
}
