package execution

import "time"

type BlockState string

const (
	BlockStateExecuted BlockState = "executed"
	BlockStateFailed   BlockState = "failed"
)

type ExplainState string

const (
	ExplainStateAvailable ExplainState = "available"
	ExplainStateFailed    ExplainState = "failed"
)

type Block struct {
	ID         string          `json:"id"`
	Intent     BlockIntent     `json:"intent"`
	Target     BlockTarget     `json:"target"`
	Result     BlockResult     `json:"result"`
	Explain    BlockExplain    `json:"explain"`
	Provenance BlockProvenance `json:"provenance"`
	CreatedAt  time.Time       `json:"created_at"`
	UpdatedAt  time.Time       `json:"updated_at"`
}

type BlockIntent struct {
	Prompt  string `json:"prompt"`
	Command string `json:"command"`
}

type BlockTarget struct {
	WorkspaceID        string `json:"workspace_id,omitempty"`
	WidgetID           string `json:"widget_id,omitempty"`
	RepoRoot           string `json:"repo_root,omitempty"`
	TargetSession      string `json:"target_session,omitempty"`
	TargetConnectionID string `json:"target_connection_id,omitempty"`
}

type BlockResult struct {
	State         BlockState `json:"state"`
	OutputExcerpt string     `json:"output_excerpt,omitempty"`
	FromSeq       uint64     `json:"from_seq,omitempty"`
}

type BlockExplain struct {
	State     ExplainState `json:"state"`
	MessageID string       `json:"message_id,omitempty"`
	Summary   string       `json:"summary,omitempty"`
	Error     string       `json:"error,omitempty"`
}

type BlockProvenance struct {
	CommandAuditEventID string `json:"command_audit_event_id,omitempty"`
	ExplainAuditEventID string `json:"explain_audit_event_id,omitempty"`
}
