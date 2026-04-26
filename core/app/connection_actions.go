package app

import (
	"context"
	"path/filepath"
	"strings"

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

func (r *Runtime) ListRemoteProfiles() []connections.RemoteProfile {
	return r.Connections.ListRemoteProfiles()
}

func (r *Runtime) SaveRemoteProfile(input connections.SaveRemoteProfileInput) (connections.RemoteProfile, []connections.RemoteProfile, error) {
	return r.Connections.SaveRemoteProfile(input)
}

func (r *Runtime) DeleteRemoteProfile(profileID string) ([]connections.RemoteProfile, error) {
	return r.Connections.DeleteRemoteProfile(profileID)
}

func (r *Runtime) ListRemoteProfileTmuxSessions(ctx context.Context, profileID string) ([]connections.TmuxSession, error) {
	return r.Connections.ListRemoteProfileTmuxSessions(ctx, profileID)
}

func (r *Runtime) ImportRemoteProfilesFromSSHConfig(path string) (connections.SSHConfigImportResult, error) {
	path = strings.TrimSpace(path)
	if path == "" {
		path = filepath.Join(r.HomeDir, ".ssh", "config")
	}
	return r.Connections.ImportSSHConfig(path)
}
