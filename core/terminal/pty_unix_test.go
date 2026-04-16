//go:build darwin || linux

package terminal

import (
	"context"
	"errors"
	"strings"
	"testing"
)

func TestBuildCommandAddsSSHDefaults(t *testing.T) {
	t.Parallel()

	cmd, err := buildCommand(context.Background(), LaunchOptions{
		WidgetID: "term-ssh",
		Connection: ConnectionSpec{
			Kind: "ssh",
			SSH: &SSHConfig{
				Host:         "example.com",
				User:         "deploy",
				Port:         2222,
				IdentityFile: "/tmp/id_ed25519",
			},
		},
	})
	if err != nil {
		t.Fatalf("buildCommand error: %v", err)
	}

	args := strings.Join(cmd.Args, " ")
	for _, expected := range []string{
		"ssh",
		"-o BatchMode=yes",
		"-o ConnectTimeout=5",
		"-o StrictHostKeyChecking=accept-new",
		"-p 2222",
		"-i /tmp/id_ed25519",
		"deploy@example.com",
	} {
		if !strings.Contains(args, expected) {
			t.Fatalf("expected args to contain %q, got %q", expected, args)
		}
	}
}

func TestBuildCommandFailsWhenSSHBinaryMissing(t *testing.T) {
	t.Parallel()

	originalResolve := resolveExecutable
	resolveExecutable = func(string) (string, error) {
		return "", errors.New("not found")
	}
	t.Cleanup(func() {
		resolveExecutable = originalResolve
	})

	_, err := buildCommand(context.Background(), LaunchOptions{
		WidgetID: "term-ssh",
		Connection: ConnectionSpec{
			Kind: "ssh",
			SSH: &SSHConfig{
				Host: "example.com",
			},
		},
	})
	if err == nil {
		t.Fatalf("expected missing ssh binary error")
	}
	if !strings.Contains(err.Error(), "ssh binary is not available") {
		t.Fatalf("unexpected error: %v", err)
	}
}
