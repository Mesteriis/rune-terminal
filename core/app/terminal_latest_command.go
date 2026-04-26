package app

import (
	"strings"
	"time"

	"github.com/Mesteriis/rune-terminal/core/execution"
	"github.com/Mesteriis/rune-terminal/core/terminal"
)

type TerminalLatestCommandResult struct {
	WidgetID            string                 `json:"widget_id"`
	SessionID           string                 `json:"session_id"`
	Command             string                 `json:"command"`
	FromSeq             uint64                 `json:"from_seq"`
	SubmittedAt         time.Time              `json:"submitted_at"`
	OutputExcerpt       string                 `json:"output_excerpt,omitempty"`
	Status              terminal.Status        `json:"status"`
	StatusDetail        string                 `json:"status_detail,omitempty"`
	ExitCode            *int                   `json:"exit_code,omitempty"`
	CommandAuditEventID string                 `json:"command_audit_event_id,omitempty"`
	ExecutionBlockID    string                 `json:"execution_block_id,omitempty"`
	ExplainState        execution.ExplainState `json:"explain_state,omitempty"`
	ExplainSummary      string                 `json:"explain_summary,omitempty"`
}

func (r *Runtime) TerminalLatestCommand(widgetID string) (TerminalLatestCommandResult, error) {
	commandRecord, err := r.Terminals.LatestCommand(widgetID)
	if err != nil {
		return TerminalLatestCommandResult{}, err
	}

	snapshot, err := r.TerminalSnapshot(widgetID, commandRecord.FromSeq)
	if err != nil {
		return TerminalLatestCommandResult{}, err
	}

	result := TerminalLatestCommandResult{
		WidgetID:      widgetID,
		SessionID:     snapshot.State.SessionID,
		Command:       strings.TrimSpace(commandRecord.Command),
		FromSeq:       commandRecord.FromSeq,
		SubmittedAt:   commandRecord.SubmittedAt,
		OutputExcerpt: summarizeTerminalOutput(commandRecord.Command, snapshot.Chunks),
		Status:        snapshot.State.Status,
		StatusDetail:  strings.TrimSpace(snapshot.State.StatusDetail),
		ExitCode:      snapshot.State.ExitCode,
	}

	if block, ok := r.findLatestExecutionBlockForCommand(widgetID, result.Command, commandRecord.FromSeq); ok {
		result.CommandAuditEventID = strings.TrimSpace(block.Provenance.CommandAuditEventID)
		result.ExecutionBlockID = strings.TrimSpace(block.ID)
		result.ExplainState = block.Explain.State
		result.ExplainSummary = strings.TrimSpace(block.Explain.Summary)
	}

	return result, nil
}

func (r *Runtime) findLatestExecutionBlockForCommand(widgetID string, command string, fromSeq uint64) (execution.Block, bool) {
	if r.Execution == nil {
		return execution.Block{}, false
	}

	blocks := r.Execution.List("", 0)
	trimmedCommand := strings.TrimSpace(command)

	for index := len(blocks) - 1; index >= 0; index -= 1 {
		block := blocks[index]
		if strings.TrimSpace(block.Target.WidgetID) != widgetID {
			continue
		}
		if strings.TrimSpace(block.Intent.Command) != trimmedCommand {
			continue
		}
		if block.Result.FromSeq != fromSeq {
			continue
		}
		return block, true
	}

	return execution.Block{}, false
}
