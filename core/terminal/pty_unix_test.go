//go:build darwin || linux

package terminal

import (
	"context"
	"strings"
	"testing"
)

func TestBuildCommandLocalShell(t *testing.T) {
	t.Parallel()

	cmd, err := buildCommand(context.Background(), LaunchOptions{
		WidgetID:   "term-main",
		Shell:      "/bin/sh",
		WorkingDir: "/tmp",
		Connection: ConnectionSpec{ID: "local", Name: "Local Machine", Kind: "local"},
	})
	if err != nil {
		t.Fatalf("build local command: %v", err)
	}
	if cmd.Path != "/bin/sh" {
		t.Fatalf("expected /bin/sh path, got %q", cmd.Path)
	}
	if cmd.Dir != "/tmp" {
		t.Fatalf("expected working dir /tmp, got %q", cmd.Dir)
	}
}

func TestBuildCommandSSH(t *testing.T) {
	t.Parallel()

	cmd, err := buildCommand(context.Background(), LaunchOptions{
		WidgetID: "term-remote",
		Connection: ConnectionSpec{
			ID:   "conn_remote",
			Name: "Prod",
			Kind: "ssh",
			SSH: &SSHConfig{
				Host:         "prod.example.com",
				User:         "deploy",
				Port:         2222,
				IdentityFile: "~/.ssh/id_ed25519",
			},
		},
	})
	if err != nil {
		t.Fatalf("build ssh command: %v", err)
	}
	if !strings.HasSuffix(cmd.Path, "ssh") {
		t.Fatalf("expected ssh path, got %q", cmd.Path)
	}
	args := strings.Join(cmd.Args, " ")
	for _, fragment := range []string{"-p 2222", "-i ~/.ssh/id_ed25519", "deploy@prod.example.com"} {
		if !strings.Contains(args, fragment) {
			t.Fatalf("expected %q in args %q", fragment, args)
		}
	}
}
