package app

import (
	"strings"

	"github.com/Mesteriis/rune-terminal/core/terminal"
)

type TerminalDiagnosticsResult struct {
	WidgetID      string          `json:"widget_id"`
	SessionState  terminal.Status `json:"session_state"`
	StatusDetail  string          `json:"status_detail,omitempty"`
	IssueSummary  string          `json:"issue_summary,omitempty"`
	OutputExcerpt string          `json:"output_excerpt,omitempty"`
}

func (r *Runtime) TerminalDiagnostics(widgetID string) (TerminalDiagnosticsResult, error) {
	snapshot, err := r.TerminalSnapshot(widgetID, 0)
	if err != nil {
		return TerminalDiagnosticsResult{}, err
	}

	statusDetail := strings.TrimSpace(snapshot.State.StatusDetail)
	outputExcerpt := summarizeTerminalDiagnosticsOutput(snapshot.Chunks)
	issueSummary := summarizeTerminalIssue(snapshot.State)
	if issueSummary == "" {
		issueSummary = summarizeTerminalIssueFromOutput(outputExcerpt)
	}

	return TerminalDiagnosticsResult{
		WidgetID:      snapshot.State.WidgetID,
		SessionState:  snapshot.State.Status,
		StatusDetail:  statusDetail,
		IssueSummary:  issueSummary,
		OutputExcerpt: outputExcerpt,
	}, nil
}

func summarizeTerminalIssue(state terminal.State) string {
	statusDetail := strings.TrimSpace(state.StatusDetail)
	switch state.Status {
	case terminal.StatusFailed:
		if statusDetail != "" {
			return statusDetail
		}
		return "Terminal session failed."
	case terminal.StatusExited:
		if statusDetail != "" {
			return statusDetail
		}
		if state.ExitCode != nil {
			return "Terminal session exited with a non-running status."
		}
		return "Terminal session exited."
	case terminal.StatusDisconnected:
		if statusDetail != "" {
			return statusDetail
		}
		return "Terminal session is disconnected."
	}

	if statusDetail != "" && !state.CanSendInput {
		return statusDetail
	}

	return statusDetail
}

func summarizeTerminalIssueFromOutput(outputExcerpt string) string {
	trimmed := strings.TrimSpace(outputExcerpt)
	if trimmed == "" {
		return ""
	}

	lines := strings.Split(trimmed, "\n")
	for index := len(lines) - 1; index >= 0; index-- {
		line := strings.TrimSpace(lines[index])
		if line != "" {
			return line
		}
	}

	return ""
}

func summarizeTerminalDiagnosticsOutput(chunks []terminal.OutputChunk) string {
	outputExcerpt := summarizeTerminalOutput("", chunks)
	trimmed := strings.TrimSpace(outputExcerpt)
	if trimmed == "" {
		return ""
	}

	lines := strings.Split(trimmed, "\n")
	if len(lines) >= 2 {
		firstLine := strings.TrimSpace(lines[0])
		secondLine := strings.TrimSpace(lines[1])
		firstFields := strings.Fields(firstLine)
		if len(firstFields) > 0 {
			commandName := firstFields[0]
			if strings.HasPrefix(secondLine, commandName+":") {
				return strings.Join(lines[1:], "\n")
			}
		}
	}

	return outputExcerpt
}
