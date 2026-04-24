package agent

import "testing"

func TestProviderViewMarksClaudeAuthRequired(t *testing.T) {
	t.Parallel()

	previousResolveProviderCLICommand := resolveProviderCLICommand
	previousInspectClaudeCLIAuthStatus := inspectClaudeCLIAuthStatus
	defer func() {
		resolveProviderCLICommand = previousResolveProviderCLICommand
		inspectClaudeCLIAuthStatus = previousInspectClaudeCLIAuthStatus
	}()

	resolveProviderCLICommand = func(command string) (string, error) {
		return "/usr/local/bin/claude", nil
	}
	inspectClaudeCLIAuthStatus = func(commandPath string) (string, string, bool) {
		return "auth-required", "Claude Code CLI is installed but not logged in.", true
	}

	view := claudeProviderSettingsViewFromSettings(&ClaudeProviderSettings{
		Command: "claude",
		Model:   "sonnet",
	})

	if view == nil {
		t.Fatal("expected claude provider view")
	}
	if view.StatusState != "auth-required" {
		t.Fatalf("expected auth-required status, got %#v", view)
	}
	if view.ResolvedBinary != "/usr/local/bin/claude" {
		t.Fatalf("unexpected resolved binary: %#v", view)
	}
}

func TestProviderViewMarksCodexReadyWhenAuthenticated(t *testing.T) {
	t.Parallel()

	previousResolveProviderCLICommand := resolveProviderCLICommand
	previousInspectCodexCLIAuthStatus := inspectCodexCLIAuthStatus
	defer func() {
		resolveProviderCLICommand = previousResolveProviderCLICommand
		inspectCodexCLIAuthStatus = previousInspectCodexCLIAuthStatus
	}()

	resolveProviderCLICommand = func(command string) (string, error) {
		return "/usr/local/bin/codex", nil
	}
	inspectCodexCLIAuthStatus = func(commandPath string) (string, string, bool) {
		return "ready", "Codex CLI is authenticated.", true
	}

	view := codexProviderSettingsViewFromSettings(&CodexProviderSettings{
		Command: "codex",
		Model:   defaultCodexModel,
	})

	if view == nil {
		t.Fatal("expected codex provider view")
	}
	if view.StatusState != "ready" {
		t.Fatalf("expected ready status, got %#v", view)
	}
	if view.Model != defaultCodexModel {
		t.Fatalf("unexpected model: %#v", view)
	}
}
