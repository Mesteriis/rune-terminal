package connections

import (
	"path/filepath"
	"testing"
)

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
}

func TestSaveSSHConnectionPersistsAndCanBeSelected(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "connections.json")
	svc, err := NewService(path)
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

	reloaded, err := NewService(path)
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
}
