package connections

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"slices"
	"strings"
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
	if connection.Runtime.LaunchError != "ssh exited with code 255" {
		t.Fatalf("expected normalized launch error to preserve unknown failure text, got %q", connection.Runtime.LaunchError)
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

func TestLaunchSuccessDoesNotErasePreflightAttention(t *testing.T) {
	t.Parallel()

	connectionID := "conn-preflight-warning"
	svc, err := NewServiceWithChecker(filepath.Join(t.TempDir(), "connections.json"), stubChecker{
		results: map[string]CheckResult{
			connectionID: {
				Status:    CheckStatusFailed,
				Error:     "identity file is not accessible",
				CheckedAt: time.Unix(400, 0).UTC(),
			},
		},
	})
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	connection, _, err := svc.SaveSSH(SaveSSHInput{
		ID:           connectionID,
		Name:         "Prod",
		Host:         "prod.example.com",
		IdentityFile: "~/missing-key",
	})
	if err != nil {
		t.Fatalf("save ssh: %v", err)
	}
	if connection.Runtime.CheckStatus != CheckStatusFailed {
		t.Fatalf("expected failed preflight check, got %q", connection.Runtime.CheckStatus)
	}

	connection, _, err = svc.ReportLaunchResult(connectionID, nil)
	if err != nil {
		t.Fatalf("report launch success: %v", err)
	}
	if connection.Runtime.LaunchStatus != LaunchStatusSucceeded {
		t.Fatalf("expected successful launch, got %q", connection.Runtime.LaunchStatus)
	}
	if connection.Usability != UsabilityAttention {
		t.Fatalf("expected usability to stay attention when preflight is still failing, got %q", connection.Usability)
	}
}

func TestSaveSSHEditResetsStaleLaunchStateWhenProfileMaterialChanges(t *testing.T) {
	t.Parallel()

	connectionID := "conn-edit-reset"
	svc, err := NewServiceWithChecker(filepath.Join(t.TempDir(), "connections.json"), stubChecker{
		results: map[string]CheckResult{
			connectionID: {
				Status:    CheckStatusPassed,
				CheckedAt: time.Unix(410, 0).UTC(),
			},
		},
	})
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	if _, _, err := svc.SaveSSH(SaveSSHInput{
		ID:   connectionID,
		Name: "Prod",
		Host: "prod.example.com",
		User: "deploy",
	}); err != nil {
		t.Fatalf("save ssh: %v", err)
	}
	if _, _, err := svc.ReportLaunchResult(connectionID, errors.New("connection refused")); err != nil {
		t.Fatalf("report launch failure: %v", err)
	}

	connection, _, err := svc.SaveSSH(SaveSSHInput{
		ID:   connectionID,
		Name: "Prod",
		Host: "prod-v2.example.com",
		User: "deploy",
	})
	if err != nil {
		t.Fatalf("save updated ssh: %v", err)
	}

	if connection.Runtime.LaunchStatus != LaunchStatusIdle {
		t.Fatalf("expected stale launch state to reset to idle, got %q", connection.Runtime.LaunchStatus)
	}
	if connection.Runtime.LaunchError != "" {
		t.Fatalf("expected stale launch error to clear after material edit, got %q", connection.Runtime.LaunchError)
	}
	if connection.Runtime.LastLaunchedAt != nil {
		t.Fatalf("expected last launch timestamp to clear after material edit, got %v", connection.Runtime.LastLaunchedAt)
	}
}

func TestReportLaunchResultNormalizesCommonSSHFailures(t *testing.T) {
	t.Parallel()

	connectionID := "conn-launch-errors"
	svc, err := NewServiceWithChecker(filepath.Join(t.TempDir(), "connections.json"), stubChecker{
		results: map[string]CheckResult{},
	})
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	if _, _, err := svc.SaveSSH(SaveSSHInput{
		ID:   connectionID,
		Name: "Prod",
		Host: "prod.example.com",
	}); err != nil {
		t.Fatalf("save ssh: %v", err)
	}

	testCases := []struct {
		name    string
		input   string
		wantErr string
	}{
		{
			name:    "auth failure",
			input:   "failed to open shell on Prod: terminal launch exited before becoming usable (exit code 255): Permission denied (publickey).",
			wantErr: "SSH authentication failed. Check the username, key, agent, or passphrase setup.",
		},
		{
			name:    "host key failure",
			input:   "terminal launch exited before becoming usable (exit code 255): Host key verification failed.",
			wantErr: "SSH host key verification failed. Confirm the host fingerprint or refresh the known_hosts entry.",
		},
		{
			name:    "timeout",
			input:   "terminal launch exited before becoming usable (exit code 255): Connection timed out",
			wantErr: "SSH connection timed out before the shell became usable.",
		},
		{
			name:    "passphrase",
			input:   "terminal launch exited before becoming usable (exit code 255): Enter passphrase for key '/Users/avm/.ssh/id_prod':",
			wantErr: "SSH key access requires an unlocked passphrase or agent.",
		},
		{
			name:    "tmux missing",
			input:   "terminal launch exited before becoming usable (exit code 127): sh: tmux: command not found",
			wantErr: "Remote host does not have tmux installed for this profile's resume mode.",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			connection, _, err := svc.ReportLaunchResult(connectionID, errors.New(tc.input))
			if err != nil {
				t.Fatalf("report launch failure: %v", err)
			}
			if connection.Runtime.LaunchError != tc.wantErr {
				t.Fatalf("expected normalized launch error %q, got %q", tc.wantErr, connection.Runtime.LaunchError)
			}
		})
	}
}

func TestRemoteProfilesCanBeSavedListedAndDeleted(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "connections.json")
	svc, err := NewServiceWithChecker(path, stubChecker{
		results: map[string]CheckResult{},
	})
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	saved, profiles, err := svc.SaveRemoteProfile(SaveRemoteProfileInput{
		Name:         "Prod",
		Host:         "prod.example.com",
		User:         "deploy",
		Port:         2222,
		IdentityFile: "~/.ssh/id_prod",
		LaunchMode:   LaunchModeTmux,
		TmuxSession:  "prod-main",
	})
	if err != nil {
		t.Fatalf("save remote profile: %v", err)
	}
	if saved.ID == "" {
		t.Fatalf("expected non-empty remote profile id")
	}
	if len(profiles) != 1 {
		t.Fatalf("expected one remote profile, got %d", len(profiles))
	}
	if profiles[0].Host != "prod.example.com" {
		t.Fatalf("expected host to be persisted, got %q", profiles[0].Host)
	}
	if profiles[0].LaunchMode != LaunchModeTmux {
		t.Fatalf("expected tmux launch mode to be persisted, got %q", profiles[0].LaunchMode)
	}
	if profiles[0].TmuxSession != "prod-main" {
		t.Fatalf("expected tmux session to be persisted, got %q", profiles[0].TmuxSession)
	}

	if _, err := svc.Select(saved.ID); err != nil {
		t.Fatalf("select saved profile as active connection: %v", err)
	}

	remaining, err := svc.DeleteRemoteProfile(saved.ID)
	if err != nil {
		t.Fatalf("delete remote profile: %v", err)
	}
	if len(remaining) != 0 {
		t.Fatalf("expected no remote profiles after delete, got %d", len(remaining))
	}
	active, err := svc.Active()
	if err != nil {
		t.Fatalf("active after delete: %v", err)
	}
	if active.ID != "local" {
		t.Fatalf("expected active connection to fall back to local after delete, got %q", active.ID)
	}

	reloaded, err := NewServiceWithChecker(path, stubChecker{
		results: map[string]CheckResult{},
	})
	if err != nil {
		t.Fatalf("reload service: %v", err)
	}
	profiles = reloaded.ListRemoteProfiles()
	if len(profiles) != 0 {
		t.Fatalf("expected no remote profiles after reload, got %d", len(profiles))
	}
}

func TestRemoteProfilesNormalizeTmuxLaunchPolicy(t *testing.T) {
	t.Parallel()

	path := filepath.Join(t.TempDir(), "connections.json")
	svc, err := NewServiceWithChecker(path, stubChecker{
		results: map[string]CheckResult{},
	})
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	saved, _, err := svc.SaveRemoteProfile(SaveRemoteProfileInput{
		Name:       "Prod Primary",
		Host:       "prod.example.com",
		LaunchMode: LaunchModeTmux,
	})
	if err != nil {
		t.Fatalf("save remote profile: %v", err)
	}
	if saved.LaunchMode != LaunchModeTmux {
		t.Fatalf("expected tmux launch mode, got %q", saved.LaunchMode)
	}
	if saved.TmuxSession != "Prod-Primary" {
		t.Fatalf("expected derived tmux session name, got %q", saved.TmuxSession)
	}

	connection, err := svc.Resolve(saved.ID)
	if err != nil {
		t.Fatalf("resolve connection: %v", err)
	}
	if connection.SSH == nil || connection.SSH.LaunchMode != LaunchModeTmux {
		t.Fatalf("expected connection ssh launch mode to be tmux, got %#v", connection.SSH)
	}
	if connection.SSH.TmuxSession == "" {
		t.Fatalf("expected derived tmux session on resolved connection")
	}
}

func TestImportSSHConfigCreatesProfilesAndSkipsUnsupportedHosts(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "ssh_config")
	identityPath := filepath.Join(tempDir, "id_prod")
	if err := os.WriteFile(identityPath, []byte("key"), 0o600); err != nil {
		t.Fatalf("write identity: %v", err)
	}
	if err := os.WriteFile(configPath, []byte(`
Host prod prod-short
  HostName=prod.example.com
  User deploy
  Port 2222
  IdentityFile `+identityPath+`

Host *.internal
  User ignored

Match host special
  User ignored
`), 0o600); err != nil {
		t.Fatalf("write config: %v", err)
	}
	svc, err := NewServiceWithChecker(filepath.Join(tempDir, "connections.json"), stubChecker{
		results: map[string]CheckResult{},
	})
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	result, err := svc.ImportSSHConfig(configPath)
	if err != nil {
		t.Fatalf("import ssh config: %v", err)
	}
	if len(result.Imported) != 2 {
		t.Fatalf("expected two imported profiles, got %#v", result.Imported)
	}
	if result.Imported[0].Name != "prod" || result.Imported[0].Host != "prod.example.com" {
		t.Fatalf("unexpected imported profile: %#v", result.Imported[0])
	}
	if result.Imported[0].User != "deploy" || result.Imported[0].Port != 2222 {
		t.Fatalf("expected user/port from config, got %#v", result.Imported[0])
	}
	if result.Imported[0].IdentityFile != identityPath {
		t.Fatalf("expected identity file %q, got %q", identityPath, result.Imported[0].IdentityFile)
	}
	if len(result.Skipped) != 1 || result.Skipped[0].Host != "*.internal" {
		t.Fatalf("expected wildcard host to be skipped, got %#v", result.Skipped)
	}
}

func TestImportSSHConfigTransferredStatusStringsStayHumanReadable(t *testing.T) {
	t.Parallel()

	if got := normalizeLaunchError(errors.New("terminal launch exited before becoming usable (exit code 255): Name or service not known")); got != "SSH could not resolve the remote hostname." {
		t.Fatalf("expected hostname failure normalization, got %q", got)
	}
	if got := normalizeLaunchError(errors.New("terminal launch exited before becoming usable (exit code 255): No route to host")); got != "SSH could not reach the remote host." {
		t.Fatalf("expected route failure normalization, got %q", got)
	}
	if !strings.HasPrefix(normalizeIdentityFileCheckError("/tmp/missing-key", os.ErrNotExist), "Identity file not found:") {
		t.Fatalf("expected missing identity prefix")
	}
}

func TestImportSSHConfigAppliesIncludeWildcardDefaultsAndMatchOverrides(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()
	sshDir := filepath.Join(tempDir, ".ssh")
	if err := os.MkdirAll(filepath.Join(sshDir, "conf.d"), 0o755); err != nil {
		t.Fatalf("mkdir ssh include dir: %v", err)
	}
	identityPath := filepath.Join(sshDir, "id_shared")
	if err := os.WriteFile(identityPath, []byte("key"), 0o600); err != nil {
		t.Fatalf("write identity: %v", err)
	}
	includedPath := filepath.Join(sshDir, "conf.d", "shared.conf")
	if err := os.WriteFile(includedPath, []byte(`
Host prod-* stage
  User deploy
  Port 2200
  IdentityFile `+identityPath+`

Host prod-1
  HostName prod-1.example.com

Host stage
  HostName stage.example.com

Match host prod-1.example.com
  User ops
`), 0o600); err != nil {
		t.Fatalf("write included config: %v", err)
	}
	configPath := filepath.Join(sshDir, "config")
	if err := os.WriteFile(configPath, []byte(`
Include conf.d/*.conf
`), 0o600); err != nil {
		t.Fatalf("write config: %v", err)
	}

	svc, err := NewServiceWithChecker(filepath.Join(tempDir, "connections.json"), stubChecker{
		results: map[string]CheckResult{},
	})
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	result, err := svc.ImportSSHConfig(configPath)
	if err != nil {
		t.Fatalf("import ssh config: %v", err)
	}
	if len(result.Imported) != 2 {
		t.Fatalf("expected two imported profiles, got %#v", result.Imported)
	}

	prodIndex := slices.IndexFunc(result.Imported, func(profile RemoteProfile) bool { return profile.Name == "prod-1" })
	stageIndex := slices.IndexFunc(result.Imported, func(profile RemoteProfile) bool { return profile.Name == "stage" })
	if prodIndex < 0 || stageIndex < 0 {
		t.Fatalf("expected prod-1 and stage profiles, got %#v", result.Imported)
	}

	prodProfile := result.Imported[prodIndex]
	if prodProfile.Host != "prod-1.example.com" || prodProfile.User != "deploy" || prodProfile.Port != 2200 {
		t.Fatalf("expected included wildcard defaults for prod-1, got %#v", prodProfile)
	}
	if prodProfile.IdentityFile != identityPath {
		t.Fatalf("expected identity file %q, got %q", identityPath, prodProfile.IdentityFile)
	}

	stageProfile := result.Imported[stageIndex]
	if stageProfile.Host != "stage.example.com" || stageProfile.User != "deploy" || stageProfile.Port != 2200 {
		t.Fatalf("expected included defaults for stage, got %#v", stageProfile)
	}
}

func TestImportSSHConfigMatchOriginalHostOverridesConcreteAlias(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "ssh_config")
	if err := os.WriteFile(configPath, []byte(`
Host prod
  HostName prod.example.com

Match originalhost prod
  User ops
`), 0o600); err != nil {
		t.Fatalf("write config: %v", err)
	}
	svc, err := NewServiceWithChecker(filepath.Join(tempDir, "connections.json"), stubChecker{
		results: map[string]CheckResult{},
	})
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	result, err := svc.ImportSSHConfig(configPath)
	if err != nil {
		t.Fatalf("import ssh config: %v", err)
	}
	if len(result.Imported) != 1 {
		t.Fatalf("expected one imported profile, got %#v", result.Imported)
	}
	if result.Imported[0].User != "ops" {
		t.Fatalf("expected Match originalhost user to apply, got %#v", result.Imported[0])
	}
}

func TestImportSSHConfigIsIdempotentByHostAlias(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "ssh_config")
	if err := os.WriteFile(configPath, []byte(`
Host prod
  HostName prod.example.com
  User deploy
`), 0o600); err != nil {
		t.Fatalf("write config: %v", err)
	}
	svc, err := NewServiceWithChecker(filepath.Join(tempDir, "connections.json"), stubChecker{
		results: map[string]CheckResult{},
	})
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	first, err := svc.ImportSSHConfig(configPath)
	if err != nil {
		t.Fatalf("first import: %v", err)
	}
	if err := os.WriteFile(configPath, []byte(`
Host prod
  HostName prod.internal
  User ops
`), 0o600); err != nil {
		t.Fatalf("rewrite config: %v", err)
	}
	second, err := svc.ImportSSHConfig(configPath)
	if err != nil {
		t.Fatalf("second import: %v", err)
	}

	if len(second.Profiles) != 1 {
		t.Fatalf("expected idempotent import to keep one profile, got %#v", second.Profiles)
	}
	if first.Imported[0].ID != second.Imported[0].ID {
		t.Fatalf("expected repeated import to update same profile id, got %q then %q", first.Imported[0].ID, second.Imported[0].ID)
	}
	if second.Imported[0].Host != "prod.internal" || second.Imported[0].User != "ops" {
		t.Fatalf("expected imported profile to be updated, got %#v", second.Imported[0])
	}
}
