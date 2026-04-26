package agent

import "testing"

func TestProbeCLIProviderMarksClaudeAuthRequired(t *testing.T) {
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

	probe, err := ProbeCLIProvider(ProviderRecord{
		Kind: ProviderKindClaude,
		Claude: &ClaudeProviderSettings{
			Command: "claude",
			Model:   "sonnet",
		},
	})
	if err != nil {
		t.Fatalf("ProbeCLIProvider error: %v", err)
	}
	if probe.StatusState != "auth-required" {
		t.Fatalf("expected auth-required status, got %#v", probe)
	}
	if probe.ResolvedBinary != "/usr/local/bin/claude" {
		t.Fatalf("unexpected resolved binary: %#v", probe)
	}
}

func TestProbeCLIProviderMarksCodexReadyWhenAuthenticated(t *testing.T) {
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

	probe, err := ProbeCLIProvider(ProviderRecord{
		Kind: ProviderKindCodex,
		Codex: &CodexProviderSettings{
			Command: "codex",
			Model:   defaultCodexModel,
		},
	})
	if err != nil {
		t.Fatalf("ProbeCLIProvider error: %v", err)
	}
	if probe.StatusState != "ready" {
		t.Fatalf("expected ready status, got %#v", probe)
	}
	if probe.StatusMessage != "Codex CLI is authenticated." {
		t.Fatalf("unexpected probe result: %#v", probe)
	}
}
