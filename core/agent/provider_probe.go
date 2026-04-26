package agent

import "fmt"

type CLIProbeResult struct {
	StatusState    string
	StatusMessage  string
	ResolvedBinary string
}

func ProbeCLIProvider(record ProviderRecord) (CLIProbeResult, error) {
	switch record.Kind {
	case ProviderKindCodex:
		return probeCLICommand(
			firstNonEmpty(record.CodexCommand(), defaultCodexCommand),
			"Codex CLI",
			inspectCodexCLIAuthStatus,
		), nil
	case ProviderKindClaude:
		return probeCLICommand(
			firstNonEmpty(record.ClaudeCommand(), defaultClaudeCommand),
			"Claude Code CLI",
			inspectClaudeCLIAuthStatus,
		), nil
	default:
		return CLIProbeResult{}, fmt.Errorf("%w: %s", ErrProviderKindUnsupported, record.Kind)
	}
}

func (p ProviderRecord) CodexCommand() string {
	if p.Codex == nil {
		return ""
	}
	return p.Codex.Command
}

func (p ProviderRecord) ClaudeCommand() string {
	if p.Claude == nil {
		return ""
	}
	return p.Claude.Command
}

func probeCLICommand(command string, label string, inspectAuth func(string) (string, string, bool)) CLIProbeResult {
	result := CLIProbeResult{}
	populateCLIStatus(
		command,
		label,
		inspectAuth,
		&result.StatusState,
		&result.StatusMessage,
		&result.ResolvedBinary,
	)
	return result
}
