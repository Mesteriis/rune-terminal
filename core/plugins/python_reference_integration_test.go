package plugins

import (
	"context"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"testing"
	"time"
)

func TestOSProcessSpawnerInvokesPythonReferencePlugin(t *testing.T) {
	t.Parallel()

	pythonPath, err := exec.LookPath("python3")
	if err != nil {
		t.Skip("python3 is required for the non-Go reference plugin integration test")
	}

	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve current test file")
	}
	pluginPath := filepath.Clean(filepath.Join(filepath.Dir(currentFile), "..", "..", "plugins", "python_reference", "plugin.py"))
	if _, err := os.Stat(pluginPath); err != nil {
		t.Fatalf("python reference plugin is missing: %v", err)
	}

	pluginRuntime := NewRuntime(OSProcessSpawner{}, 2*time.Second)
	result, err := pluginRuntime.Invoke(context.Background(), PluginSpec{
		Name: "example.python_reference",
		Process: ProcessConfig{
			Command: pythonPath,
			Args:    []string{pluginPath},
		},
		Capabilities: []string{"tool.execute"},
	}, InvokeRequest{
		ToolName: "plugin.python_echo",
		Context: RequestContext{
			WorkspaceID: "ws-python",
			RepoRoot:    "/workspace/python-reference",
		},
		Input: json.RawMessage(`{"text":"hello from python"}`),
	})
	if err != nil {
		t.Fatalf("Invoke error: %v", err)
	}
	if result.Manifest.PluginID != "example.python_reference" {
		t.Fatalf("unexpected manifest: %#v", result.Manifest)
	}
	if len(result.Manifest.Capabilities) != 1 || result.Manifest.Capabilities[0] != "tool.execute" {
		t.Fatalf("unexpected manifest capabilities: %#v", result.Manifest.Capabilities)
	}

	var output struct {
		Language    string `json:"language"`
		Text        string `json:"text"`
		Uppercase   string `json:"uppercase"`
		Length      int    `json:"length"`
		WorkspaceID string `json:"workspace_id"`
		RepoRoot    string `json:"repo_root"`
	}
	if err := json.Unmarshal(result.Output, &output); err != nil {
		t.Fatalf("output unmarshal: %v", err)
	}
	if output.Language != "python" ||
		output.Text != "hello from python" ||
		output.Uppercase != "HELLO FROM PYTHON" ||
		output.Length != len("hello from python") ||
		output.WorkspaceID != "ws-python" ||
		output.RepoRoot != "/workspace/python-reference" {
		t.Fatalf("unexpected output: %#v", output)
	}
}
