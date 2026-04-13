package toolruntime

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/Mesteriis/rune-terminal/core/policy"
)

type TargetKind string

const (
	TargetWorkspace TargetKind = "workspace"
	TargetWidget    TargetKind = "widget"
	TargetPolicy    TargetKind = "policy"
)

type Metadata struct {
	Capabilities []string            `json:"capabilities"`
	ApprovalTier policy.ApprovalTier `json:"approval_tier"`
	Mutating     bool                `json:"mutating"`
	TargetKind   TargetKind          `json:"target_kind"`
}

type ExecutionContext struct {
	WorkspaceID    string `json:"workspace_id,omitempty"`
	RepoRoot       string `json:"repo_root,omitempty"`
	ActiveWidgetID string `json:"active_widget_id,omitempty"`
}

type Operation struct {
	Summary              string              `json:"summary"`
	AffectedPaths        []string            `json:"affected_paths,omitempty"`
	AffectedWidgets      []string            `json:"affected_widgets,omitempty"`
	RequiredCapabilities []string            `json:"required_capabilities,omitempty"`
	ApprovalTier         policy.ApprovalTier `json:"approval_tier,omitempty"`
}

type OperationPlan struct {
	Operation
	RequiresAllowedRoots bool
	ChecksIgnoreRules    bool
}

type Definition struct {
	Name         string
	Description  string
	InputSchema  json.RawMessage
	OutputSchema json.RawMessage
	Metadata     Metadata
	Decode       func(json.RawMessage) (any, error)
	Plan         func(any, ExecutionContext) (OperationPlan, error)
	Execute      func(context.Context, ExecutionContext, any) (any, error)
}

type ToolInfo struct {
	Name         string          `json:"name"`
	Description  string          `json:"description"`
	InputSchema  json.RawMessage `json:"input_schema"`
	OutputSchema json.RawMessage `json:"output_schema"`
	Metadata     Metadata        `json:"metadata"`
}

type ExecuteRequest struct {
	ToolName      string           `json:"tool_name"`
	Input         json.RawMessage  `json:"input,omitempty"`
	Context       ExecutionContext `json:"context,omitempty"`
	ApprovalToken string           `json:"approval_token,omitempty"`
}

type ErrorCode string

const (
	ErrorCodeInvalidInput     ErrorCode = "invalid_input"
	ErrorCodeNotFound         ErrorCode = "not_found"
	ErrorCodePolicyDenied     ErrorCode = "policy_denied"
	ErrorCodeApprovalRequired ErrorCode = "approval_required"
	ErrorCodeInternalError    ErrorCode = "internal_error"
)

type PendingApproval struct {
	ID           string              `json:"id"`
	ToolName     string              `json:"tool_name"`
	Summary      string              `json:"summary"`
	ApprovalTier policy.ApprovalTier `json:"approval_tier"`
	CreatedAt    time.Time           `json:"created_at"`
	ExpiresAt    time.Time           `json:"expires_at"`
}

type ApprovalGrant struct {
	ApprovalID string    `json:"approval_id"`
	Token      string    `json:"approval_token"`
	ExpiresAt  time.Time `json:"expires_at"`
}

type ExecuteResponse struct {
	Status          string           `json:"status"`
	Output          any              `json:"output,omitempty"`
	Error           string           `json:"error,omitempty"`
	ErrorCode       ErrorCode        `json:"error_code,omitempty"`
	Tool            *ToolInfo        `json:"tool,omitempty"`
	Operation       *Operation       `json:"operation,omitempty"`
	PendingApproval *PendingApproval `json:"pending_approval,omitempty"`
}

func DecodeJSON[T any](raw json.RawMessage) (T, error) {
	var out T
	if len(raw) == 0 {
		raw = []byte("{}")
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&out); err != nil {
		return out, err
	}
	return out, nil
}

func EmptyDecode(raw json.RawMessage) (any, error) {
	if len(raw) != 0 && string(raw) != "{}" {
		var discard map[string]any
		if err := json.Unmarshal(raw, &discard); err != nil {
			return nil, err
		}
		if len(discard) > 0 {
			return nil, errors.New("tool does not accept input")
		}
	}
	return struct{}{}, nil
}
