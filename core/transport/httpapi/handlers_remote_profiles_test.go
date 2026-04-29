package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/agent"
	"github.com/Mesteriis/rune-terminal/core/app"
	"github.com/Mesteriis/rune-terminal/core/audit"
	"github.com/Mesteriis/rune-terminal/core/connections"
	"github.com/Mesteriis/rune-terminal/core/conversation"
	"github.com/Mesteriis/rune-terminal/core/execution"
	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/terminal"
	"github.com/Mesteriis/rune-terminal/core/workspace"
)

type tmuxProfilesChecker struct{}

func (tmuxProfilesChecker) Check(_ context.Context, _ connections.Connection) connections.CheckResult {
	return connections.CheckResult{Status: connections.CheckStatusPassed}
}

type tmuxProfilesProbe struct{}

func (tmuxProfilesProbe) ListSessions(_ context.Context, connection connections.Connection) ([]connections.TmuxSession, error) {
	if connection.ID != "conn-prod" {
		return []connections.TmuxSession{}, nil
	}
	return []connections.TmuxSession{
		{Name: "prod-main", Attached: true, WindowCount: 2},
		{Name: "prod-jobs", Attached: false, WindowCount: 1},
	}, nil
}

func TestRemoteProfilesEndpointsListSaveAndDelete(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	listRecorder := httptest.NewRecorder()
	handler.ServeHTTP(listRecorder, authedJSONRequest(t, http.MethodGet, "/api/v1/remote/profiles", nil))
	if listRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 list, got %d", listRecorder.Code)
	}

	var initial struct {
		Profiles []connections.RemoteProfile `json:"profiles"`
	}
	if err := json.Unmarshal(listRecorder.Body.Bytes(), &initial); err != nil {
		t.Fatalf("unmarshal initial list: %v", err)
	}
	if len(initial.Profiles) != 0 {
		t.Fatalf("expected zero initial remote profiles, got %d", len(initial.Profiles))
	}

	saveRecorder := httptest.NewRecorder()
	handler.ServeHTTP(saveRecorder, authedJSONRequest(t, http.MethodPost, "/api/v1/remote/profiles", map[string]any{
		"name":         "Prod",
		"host":         "prod.example.com",
		"user":         "deploy",
		"port":         2222,
		"launch_mode":  "tmux",
		"tmux_session": "prod-main",
	}))
	if saveRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 save, got %d", saveRecorder.Code)
	}

	var saved struct {
		Profile  connections.RemoteProfile   `json:"profile"`
		Profiles []connections.RemoteProfile `json:"profiles"`
	}
	if err := json.Unmarshal(saveRecorder.Body.Bytes(), &saved); err != nil {
		t.Fatalf("unmarshal save: %v", err)
	}
	if saved.Profile.ID == "" {
		t.Fatalf("expected saved profile id")
	}
	if len(saved.Profiles) != 1 {
		t.Fatalf("expected one profile after save, got %d", len(saved.Profiles))
	}
	if saved.Profile.LaunchMode != "tmux" || saved.Profile.TmuxSession != "prod-main" {
		t.Fatalf("expected tmux launch policy in saved profile, got %#v", saved.Profile)
	}

	deleteRecorder := httptest.NewRecorder()
	handler.ServeHTTP(
		deleteRecorder,
		authedJSONRequest(t, http.MethodDelete, "/api/v1/remote/profiles/"+saved.Profile.ID, nil),
	)
	if deleteRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200 delete, got %d", deleteRecorder.Code)
	}

	var deleted struct {
		Profiles []connections.RemoteProfile `json:"profiles"`
	}
	if err := json.Unmarshal(deleteRecorder.Body.Bytes(), &deleted); err != nil {
		t.Fatalf("unmarshal delete: %v", err)
	}
	if len(deleted.Profiles) != 0 {
		t.Fatalf("expected empty profile list after delete, got %d", len(deleted.Profiles))
	}

	auditRecorder := httptest.NewRecorder()
	handler.ServeHTTP(auditRecorder, authedJSONRequest(t, http.MethodGet, "/api/v1/audit?limit=10", nil))
	if auditRecorder.Code != http.StatusOK {
		t.Fatalf("expected audit 200, got %d", auditRecorder.Code)
	}

	var auditResponse struct {
		Events []struct {
			ToolName           string `json:"tool_name"`
			ActionSource       string `json:"action_source"`
			TargetConnectionID string `json:"target_connection_id"`
			Success            bool   `json:"success"`
			Error              string `json:"error"`
		} `json:"events"`
	}
	if err := json.Unmarshal(auditRecorder.Body.Bytes(), &auditResponse); err != nil {
		t.Fatalf("unmarshal audit response: %v", err)
	}
	expectedTools := []string{"remote_profiles.save", "remote_profiles.delete"}
	if len(auditResponse.Events) != len(expectedTools) {
		t.Fatalf("expected remote profile audit events %#v, got %#v", expectedTools, auditResponse.Events)
	}
	for index, expectedTool := range expectedTools {
		event := auditResponse.Events[index]
		if event.ToolName != expectedTool || event.ActionSource != "http.remote_profiles" || !event.Success || event.Error != "" {
			t.Fatalf("unexpected remote profile audit event %d: %#v", index, event)
		}
		if event.TargetConnectionID != saved.Profile.ID {
			t.Fatalf("expected target connection %q, got %#v", saved.Profile.ID, event)
		}
	}
}

func TestRemoteProfilesDeleteReturnsNotFoundForMissingProfile(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(
		recorder,
		authedJSONRequest(t, http.MethodDelete, "/api/v1/remote/profiles/missing-profile", nil),
	)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", recorder.Code)
	}

	auditRecorder := httptest.NewRecorder()
	handler.ServeHTTP(auditRecorder, authedJSONRequest(t, http.MethodGet, "/api/v1/audit?limit=10", nil))
	if auditRecorder.Code != http.StatusOK {
		t.Fatalf("expected audit 200, got %d", auditRecorder.Code)
	}
	var auditResponse struct {
		Events []struct {
			ToolName           string `json:"tool_name"`
			ActionSource       string `json:"action_source"`
			TargetConnectionID string `json:"target_connection_id"`
			Success            bool   `json:"success"`
			Error              string `json:"error"`
		} `json:"events"`
	}
	if err := json.Unmarshal(auditRecorder.Body.Bytes(), &auditResponse); err != nil {
		t.Fatalf("unmarshal audit response: %v", err)
	}
	if len(auditResponse.Events) != 1 {
		t.Fatalf("expected one failure audit event, got %#v", auditResponse.Events)
	}
	event := auditResponse.Events[0]
	if event.ToolName != "remote_profiles.delete" || event.ActionSource != "http.remote_profiles" ||
		event.TargetConnectionID != "missing-profile" || event.Success || event.Error == "" {
		t.Fatalf("unexpected remote profile delete failure audit event: %#v", event)
	}
}

func TestRemoteProfilesImportSSHConfig(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "config")
	if err := os.WriteFile(configPath, []byte(`
Host prod
  HostName prod.example.com
  User deploy
`), 0o600); err != nil {
		t.Fatalf("write config: %v", err)
	}

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(
		recorder,
		authedJSONRequest(t, http.MethodPost, "/api/v1/remote/profiles/import-ssh-config", map[string]any{
			"path": configPath,
		}),
	)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var result connections.SSHConfigImportResult
	if err := json.Unmarshal(recorder.Body.Bytes(), &result); err != nil {
		t.Fatalf("unmarshal import result: %v", err)
	}
	if len(result.Imported) != 1 {
		t.Fatalf("expected one imported profile, got %#v", result.Imported)
	}
	if result.Imported[0].Name != "prod" || result.Imported[0].Host != "prod.example.com" {
		t.Fatalf("unexpected imported profile: %#v", result.Imported[0])
	}
	if len(result.Profiles) != 1 {
		t.Fatalf("expected profiles list to include imported profile, got %#v", result.Profiles)
	}

	auditRecorder := httptest.NewRecorder()
	handler.ServeHTTP(auditRecorder, authedJSONRequest(t, http.MethodGet, "/api/v1/audit?limit=10", nil))
	if auditRecorder.Code != http.StatusOK {
		t.Fatalf("expected audit 200, got %d", auditRecorder.Code)
	}
	var auditResponse struct {
		Events []struct {
			ToolName      string   `json:"tool_name"`
			ActionSource  string   `json:"action_source"`
			AffectedPaths []string `json:"affected_paths"`
			Success       bool     `json:"success"`
			Error         string   `json:"error"`
		} `json:"events"`
	}
	if err := json.Unmarshal(auditRecorder.Body.Bytes(), &auditResponse); err != nil {
		t.Fatalf("unmarshal audit response: %v", err)
	}
	if len(auditResponse.Events) != 1 {
		t.Fatalf("expected one import audit event, got %#v", auditResponse.Events)
	}
	event := auditResponse.Events[0]
	if event.ToolName != "remote_profiles.import_ssh_config" || event.ActionSource != "http.remote_profiles" ||
		!event.Success || event.Error != "" {
		t.Fatalf("unexpected import audit event: %#v", event)
	}
	if len(event.AffectedPaths) != 1 || event.AffectedPaths[0] != configPath {
		t.Fatalf("expected imported config path %q in audit, got %#v", configPath, event)
	}
}

func TestRemoteProfilesCreateSessionReturnsNotFoundForMissingProfile(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(
		recorder,
		authedJSONRequest(t, http.MethodPost, "/api/v1/remote/profiles/missing-profile/session", map[string]any{
			"title": "Remote From Profile",
		}),
	)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d (%s)", recorder.Code, recorder.Body.String())
	}
}

func TestRemoteProfilesTmuxSessionsEndpointListsSessions(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()
	policyStore, err := policy.NewStore(filepath.Join(tempDir, "policy.json"), "/workspace/repo")
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}
	auditLog, err := audit.NewLog(filepath.Join(tempDir, "audit.jsonl"))
	if err != nil {
		t.Fatalf("NewLog error: %v", err)
	}
	agentStore, err := agent.NewStore(filepath.Join(tempDir, "agent.json"))
	if err != nil {
		t.Fatalf("agent.NewStore error: %v", err)
	}
	connectionStore, err := connections.NewServiceWithCheckerAndTmuxProbe(
		filepath.Join(tempDir, "connections.json"),
		tmuxProfilesChecker{},
		tmuxProfilesProbe{},
	)
	if err != nil {
		t.Fatalf("NewServiceWithCheckerAndTmuxProbe error: %v", err)
	}
	if _, _, err := connectionStore.SaveRemoteProfile(connections.SaveRemoteProfileInput{
		ID:         "conn-prod",
		Name:       "Prod",
		Host:       "prod.example.com",
		LaunchMode: connections.LaunchModeTmux,
	}); err != nil {
		t.Fatalf("SaveRemoteProfile error: %v", err)
	}
	conversationStore, err := conversation.NewService(filepath.Join(tempDir, "conversation.json"), testConversationProvider{})
	if err != nil {
		t.Fatalf("conversation.NewService error: %v", err)
	}
	executionStore, err := execution.NewService(filepath.Join(tempDir, "execution.json"))
	if err != nil {
		t.Fatalf("execution.NewService error: %v", err)
	}

	runtime := &app.Runtime{
		RepoRoot:     "/workspace/repo",
		HomeDir:      "/home/testuser",
		Workspace:    workspace.NewService(workspace.BootstrapDefault()),
		Terminals:    terminal.NewService(terminal.DefaultLauncher()),
		Connections:  connectionStore,
		Agent:        agentStore,
		Conversation: conversationStore,
		Execution:    executionStore,
		Policy:       policyStore,
		Audit:        auditLog,
	}

	handler := NewHandler(runtime, testAuthToken)
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(
		recorder,
		authedJSONRequest(t, http.MethodGet, "/api/v1/remote/profiles/conn-prod/tmux-sessions", nil),
	)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Sessions []connections.TmuxSession `json:"sessions"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal tmux sessions: %v", err)
	}
	if len(payload.Sessions) != 2 {
		t.Fatalf("expected two tmux sessions, got %#v", payload.Sessions)
	}
	if payload.Sessions[0].Name != "prod-main" || !payload.Sessions[0].Attached {
		t.Fatalf("unexpected first tmux session: %#v", payload.Sessions[0])
	}
}
