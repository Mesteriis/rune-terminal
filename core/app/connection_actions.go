package app

import (
	"context"

	"github.com/Mesteriis/rune-terminal/core/connections"
)

func (r *Runtime) ConnectionsSnapshot() connections.Snapshot {
	return r.Connections.Snapshot()
}

func (r *Runtime) SelectActiveConnection(connectionID string) (connections.Snapshot, error) {
	return r.Connections.Select(connectionID)
}

func (r *Runtime) SaveSSHConnection(input connections.SaveSSHInput) (connections.Connection, connections.Snapshot, error) {
	return r.Connections.SaveSSH(input)
}

func (r *Runtime) CheckConnection(ctx context.Context, connectionID string) (connections.Connection, connections.Snapshot, error) {
	return r.Connections.Check(ctx, connectionID)
}
