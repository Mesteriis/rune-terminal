package app

import (
	"context"
	"encoding/base64"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/connections"
	"github.com/Mesteriis/rune-terminal/core/workspace"
)

func TestListFSForConnectionParsesRemoteDirectoryEntries(t *testing.T) {
	runtime := newRemoteFSTestRuntime(t)

	previousRunner := runRemoteFSCommand
	runRemoteFSCommand = func(
		ctx context.Context,
		connection connections.Connection,
		remoteArgs []string,
		stdin []byte,
	) (remoteFSExecResult, error) {
		return remoteFSExecResult{
			Stdout: []byte("/remote/project\n__RTSEP__\nsrc\tdirectory\t1714170000\t0\nREADME.md\tfile\t1714170060\t12\n"),
		}, nil
	}
	defer func() {
		runRemoteFSCommand = previousRunner
	}()

	result, err := runtime.ListFSForConnection(
		context.Background(),
		"/remote/project",
		"README.md",
		"conn-ssh",
		false,
	)
	if err != nil {
		t.Fatalf("ListFSForConnection returned error: %v", err)
	}
	if result.Path != "/remote/project" {
		t.Fatalf("unexpected remote path %q", result.Path)
	}
	if len(result.Directories) != 0 {
		t.Fatalf("expected filtered directories to be empty, got %#v", result.Directories)
	}
	if len(result.Files) != 1 || result.Files[0].Name != "README.md" {
		t.Fatalf("unexpected files payload: %#v", result.Files)
	}
	if result.Files[0].ModifiedTime != 1714170060 {
		t.Fatalf("unexpected modified time: %#v", result.Files[0])
	}
}

func TestReadFSPreviewForConnectionFormatsRemoteBinaryPreview(t *testing.T) {
	runtime := newRemoteFSTestRuntime(t)

	previousRunner := runRemoteFSCommand
	runRemoteFSCommand = func(
		ctx context.Context,
		connection connections.Connection,
		remoteArgs []string,
		stdin []byte,
	) (remoteFSExecResult, error) {
		return remoteFSExecResult{
			Stdout: []byte("__RTMETA__4\n" + base64.StdEncoding.EncodeToString([]byte{0x00, 0x01, 0x02, 0x03})),
		}, nil
	}
	defer func() {
		runRemoteFSCommand = previousRunner
	}()

	result, err := runtime.ReadFSPreviewForConnection(
		context.Background(),
		"/remote/blob.bin",
		4096,
		"conn-ssh",
		false,
	)
	if err != nil {
		t.Fatalf("ReadFSPreviewForConnection returned error: %v", err)
	}
	if result.PreviewKind != "hex" {
		t.Fatalf("expected hex preview, got %#v", result)
	}
	if !strings.Contains(result.Preview, "00000000") {
		t.Fatalf("expected hex dump preview, got %q", result.Preview)
	}
	if result.SizeBytes != 4 {
		t.Fatalf("expected size 4, got %#v", result)
	}
}

func TestWriteFSFileForConnectionSendsRemoteContentOverSSH(t *testing.T) {
	runtime := newRemoteFSTestRuntime(t)

	previousRunner := runRemoteFSCommand
	callCount := 0
	runRemoteFSCommand = func(
		ctx context.Context,
		connection connections.Connection,
		remoteArgs []string,
		stdin []byte,
	) (remoteFSExecResult, error) {
		callCount++
		switch callCount {
		case 1:
			return remoteFSExecResult{
				Stdout: []byte("__RTMETA__0\n" + base64.StdEncoding.EncodeToString([]byte("before"))),
			}, nil
		case 2:
			if string(stdin) != "after" {
				t.Fatalf("unexpected remote write stdin %q", string(stdin))
			}
			return remoteFSExecResult{}, nil
		default:
			t.Fatalf("unexpected remote fs call %d", callCount)
			return remoteFSExecResult{}, nil
		}
	}
	defer func() {
		runRemoteFSCommand = previousRunner
	}()

	result, err := runtime.WriteFSFileForConnection(
		context.Background(),
		"/remote/notes.txt",
		"after",
		"conn-ssh",
	)
	if err != nil {
		t.Fatalf("WriteFSFileForConnection returned error: %v", err)
	}
	if result.Path != "/remote/notes.txt" || result.Content != "after" {
		t.Fatalf("unexpected write result %#v", result)
	}
}

func TestOpenPreviewInNewBlockAllowsRemotePathWithoutLocalStat(t *testing.T) {
	runtime := newRemoteFSTestRuntime(t)

	result, err := runtime.OpenPreviewInNewBlock("/remote/project/README.md", "term-main", "conn-ssh")
	if err != nil {
		t.Fatalf("OpenPreviewInNewBlock returned error: %v", err)
	}
	if result.WidgetID == "" {
		t.Fatalf("expected widget id, got %#v", result)
	}

	widgetFound := false
	for _, widget := range result.Workspace.Widgets {
		if widget.ID != result.WidgetID {
			continue
		}
		widgetFound = true
		if widget.ConnectionID != "conn-ssh" {
			t.Fatalf("expected remote connection id, got %#v", widget)
		}
		if widget.Path != "/remote/project/README.md" {
			t.Fatalf("expected remote preview path, got %#v", widget)
		}
	}
	if !widgetFound {
		t.Fatalf("expected preview widget %q in workspace snapshot", result.WidgetID)
	}
}

func newRemoteFSTestRuntime(t *testing.T) *Runtime {
	t.Helper()

	stateDir := t.TempDir()
	connectionStore, err := connections.NewService(filepath.Join(stateDir, "connections.json"))
	if err != nil {
		t.Fatalf("connections.NewService: %v", err)
	}
	if _, _, err := connectionStore.SaveSSH(connections.SaveSSHInput{
		ID:   "conn-ssh",
		Name: "Prod",
		Host: "prod.example",
		User: "ops",
	}); err != nil {
		t.Fatalf("SaveSSH: %v", err)
	}

	return &Runtime{
		Connections: connectionStore,
		RepoRoot:    t.TempDir(),
		Workspace:   workspace.NewService(workspace.BootstrapDefault()),
	}
}
