package connections

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

func requireSSHBinary(t *testing.T) {
	t.Helper()
	if _, err := exec.LookPath("ssh"); err != nil {
		t.Skip("ssh binary is not available")
	}
}

func TestDefaultCheckerRejectsMissingIdentityFile(t *testing.T) {
	t.Parallel()
	requireSSHBinary(t)

	result := DefaultChecker().Check(context.Background(), Connection{
		Kind: KindSSH,
		Name: "Prod",
		SSH: &SSHConfig{
			Host:         "prod.example.com",
			IdentityFile: filepath.Join(t.TempDir(), "missing-key"),
		},
	})

	if result.Status != CheckStatusFailed {
		t.Fatalf("expected failed status, got %q", result.Status)
	}
	if got, want := result.Error, "Identity file not found:"; len(got) == 0 || got[:len(want)] != want {
		t.Fatalf("expected missing identity message, got %q", result.Error)
	}
}

func TestDefaultCheckerRejectsPublicKeyIdentityFile(t *testing.T) {
	t.Parallel()
	requireSSHBinary(t)

	keyPath := filepath.Join(t.TempDir(), "id_prod.pub")
	if err := os.WriteFile(keyPath, []byte("ssh-ed25519 AAAA"), 0o600); err != nil {
		t.Fatalf("write public key: %v", err)
	}

	result := DefaultChecker().Check(context.Background(), Connection{
		Kind: KindSSH,
		Name: "Prod",
		SSH: &SSHConfig{
			Host:         "prod.example.com",
			IdentityFile: keyPath,
		},
	})

	if result.Status != CheckStatusFailed {
		t.Fatalf("expected failed status, got %q", result.Status)
	}
	if got, want := result.Error, "Identity file points to a public key. Use the private key file instead."; got != want {
		t.Fatalf("expected public key message %q, got %q", want, got)
	}
}

func TestDefaultCheckerRejectsOverlyOpenIdentityFilePermissions(t *testing.T) {
	t.Parallel()
	requireSSHBinary(t)

	keyPath := filepath.Join(t.TempDir(), "id_prod")
	if err := os.WriteFile(keyPath, []byte("private-key"), 0o644); err != nil {
		t.Fatalf("write private key: %v", err)
	}

	result := DefaultChecker().Check(context.Background(), Connection{
		Kind: KindSSH,
		Name: "Prod",
		SSH: &SSHConfig{
			Host:         "prod.example.com",
			IdentityFile: keyPath,
		},
	})

	if result.Status != CheckStatusFailed {
		t.Fatalf("expected failed status, got %q", result.Status)
	}
	if got, want := result.Error, "Identity file permissions are too open:"; len(got) == 0 || got[:len(want)] != want {
		t.Fatalf("expected open permissions message, got %q", result.Error)
	}
}
