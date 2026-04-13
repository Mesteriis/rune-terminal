package connections

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
	"time"
)

type stubChecker struct {
	results map[string]CheckResult
}

func (s stubChecker) Check(_ context.Context, connection Connection) CheckResult {
	if result, ok := s.results[connection.ID]; ok {
		return result
	}
	return CheckResult{
		Status:    CheckStatusPassed,
		CheckedAt: time.Unix(100, 0).UTC(),
	}
}

func TestNewServiceBootstrapsLocalConnection(t *testing.T) {
	t.Parallel()

	svc, err := NewService(filepath.Join(t.TempDir(), "connections.json"))
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	snapshot := svc.Snapshot()
	if snapshot.ActiveConnectionID != "local" {
		t.Fatalf("expected local active connection, got %q", snapshot.ActiveConnectionID)
	}
	if len(snapshot.Connections) != 1 {
		t.Fatalf("expected only local connection, got %d", len(snapshot.Connections))
	}
	if snapshot.Connections[0].Kind != KindLocal {
		t.Fatalf("expected local connection kind, got %q", snapshot.Connections[0].Kind)
	}
	if snapshot.Connections[0].Usability != UsabilityAvailable {
		t.Fatalf("expected local connection to be available, got %q", snapshot.Connections[0].Usability)
	}
}

func TestSaveSSHConnectionPersistsAndCanBeSelected(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "connections.json")
	svc, err := NewServiceWithChecker(path, stubChecker{
		results: map[string]CheckResult{},
	})
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	connection, snapshot, err := svc.SaveSSH(SaveSSHInput{
		Name: "Prod",
		Host: "prod.example.com",
		User: "deploy",
		Port: 2222,
	})
	if err != nil {
		t.Fatalf("save ssh: %v", err)
	}
	if connection.Kind != KindSSH {
		t.Fatalf("expected ssh kind, got %q", connection.Kind)
	}
	if connection.Runtime.CheckStatus != CheckStatusPassed {
		t.Fatalf("expected save to run preflight check, got %q", connection.Runtime.CheckStatus)
	}
	if len(snapshot.Connections) != 2 {
		t.Fatalf("expected local + ssh connections, got %d", len(snapshot.Connections))
	}

	selected, err := svc.Select(connection.ID)
	if err != nil {
		t.Fatalf("select ssh: %v", err)
	}
	if selected.ActiveConnectionID != connection.ID {
		t.Fatalf("expected active connection %q, got %q", connection.ID, selected.ActiveConnectionID)
	}

	reloaded, err := NewServiceWithChecker(path, stubChecker{
		results: map[string]CheckResult{},
	})
	if err != nil {
		t.Fatalf("reload service: %v", err)
	}
	active, err := reloaded.Active()
	if err != nil {
		t.Fatalf("active connection: %v", err)
	}
	if active.ID != connection.ID {
		t.Fatalf("expected persisted active connection %q, got %q", connection.ID, active.ID)
	}
	if active.Runtime.CheckStatus != CheckStatusPassed {
		t.Fatalf("expected persisted check status, got %q", active.Runtime.CheckStatus)
	}
}

func TestSaveSSHConnectionMarksAttentionWhenPreflightFails(t *testing.T) {
	t.Parallel()

	svc, err := NewServiceWithChecker(filepath.Join(t.TempDir(), "connections.json"), stubChecker{
		results: map[string]CheckResult{
			"conn-fixed": {
				Status:    CheckStatusFailed,
				Error:     "identity file is not accessible",
				CheckedAt: time.Unix(200, 0).UTC(),
			},
		},
	})
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	connection, _, err := svc.SaveSSH(SaveSSHInput{
		ID:           "conn-fixed",
		Name:         "Prod",
		Host:         "prod.example.com",
		IdentityFile: "~/missing-key",
	})
	if err != nil {
		t.Fatalf("save ssh: %v", err)
	}
	if connection.Usability != UsabilityAttention {
		t.Fatalf("expected attention usability, got %q", connection.Usability)
	}
	if connection.Runtime.CheckError == "" {
		t.Fatalf("expected check error to be recorded")
	}
	if connection.SSH == nil || connection.SSH.IdentityFile == "~/missing-key" {
		t.Fatalf("expected identity file normalization, got %+v", connection.SSH)
	}
}

func TestCheckAndLaunchLifecycleIsRecorded(t *testing.T) {
	t.Parallel()

	connectionID := "conn-lifecycle"
	svc, err := NewServiceWithChecker(filepath.Join(t.TempDir(), "connections.json"), stubChecker{
		results: map[string]CheckResult{
			connectionID: {
				Status:    CheckStatusPassed,
				CheckedAt: time.Unix(300, 0).UTC(),
			},
		},
	})
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	if _, _, err := svc.SaveSSH(SaveSSHInput{
		ID:   connectionID,
		Name: "Ops",
		Host: "ops.example.com",
	}); err != nil {
		t.Fatalf("save ssh: %v", err)
	}

	connection, _, err := svc.Check(context.Background(), connectionID)
	if err != nil {
		t.Fatalf("check connection: %v", err)
	}
	if connection.Runtime.CheckStatus != CheckStatusPassed {
		t.Fatalf("expected passed check status, got %q", connection.Runtime.CheckStatus)
	}

	connection, _, err = svc.ReportLaunchResult(connectionID, errors.New("ssh exited with code 255"))
	if err != nil {
		t.Fatalf("report launch failure: %v", err)
	}
	if connection.Runtime.LaunchStatus != LaunchStatusFailed {
		t.Fatalf("expected failed launch status, got %q", connection.Runtime.LaunchStatus)
	}
	if connection.Usability != UsabilityAttention {
		t.Fatalf("expected attention usability after launch failure, got %q", connection.Usability)
	}

	connection, _, err = svc.ReportLaunchResult(connectionID, nil)
	if err != nil {
		t.Fatalf("report launch success: %v", err)
	}
	if connection.Runtime.LaunchStatus != LaunchStatusSucceeded {
		t.Fatalf("expected succeeded launch status, got %q", connection.Runtime.LaunchStatus)
	}
	if connection.Runtime.LaunchError != "" {
		t.Fatalf("expected launch error to clear after success, got %q", connection.Runtime.LaunchError)
	}
	if connection.Usability != UsabilityAvailable {
		t.Fatalf("expected available usability after launch success, got %q", connection.Usability)
	}
}
