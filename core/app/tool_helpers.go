package app

import (
	"encoding/json"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/toolruntime"
)

type widgetToolInput struct {
	WidgetID string `json:"widget_id,omitempty"`
}

type focusWidgetInput struct {
	WidgetID string `json:"widget_id"`
}

type focusTabInput struct {
	TabID string `json:"tab_id"`
}

type moveTabInput struct {
	TabID       string `json:"tab_id"`
	BeforeTabID string `json:"before_tab_id"`
}

type createTerminalTabInput struct {
	Title        string `json:"title,omitempty"`
	ConnectionID string `json:"connection_id,omitempty"`
}

type closeTabInput struct {
	TabID string `json:"tab_id"`
}

type renameTabInput struct {
	TabID string `json:"tab_id"`
	Title string `json:"title"`
}

type setTabPinnedInput struct {
	TabID  string `json:"tab_id"`
	Pinned bool   `json:"pinned"`
}

type sendInputToolInput struct {
	WidgetID      string `json:"widget_id,omitempty"`
	Text          string `json:"text"`
	AppendNewline bool   `json:"append_newline,omitempty"`
}

type interruptToolInput struct {
	WidgetID string `json:"widget_id,omitempty"`
}

type confirmInput struct {
	ApprovalID string `json:"approval_id"`
}

type addTrustedRuleInput struct {
	Scope       policy.Scope              `json:"scope"`
	ScopeRef    string                    `json:"scope_ref,omitempty"`
	SubjectType policy.SubjectType        `json:"subject_type"`
	MatcherType policy.MatcherType        `json:"matcher_type"`
	Matcher     string                    `json:"matcher,omitempty"`
	Structured  *policy.StructuredMatcher `json:"structured,omitempty"`
	Note        string                    `json:"note,omitempty"`
}

type removeRuleInput struct {
	RuleID string `json:"rule_id"`
}

type addIgnoreRuleInput struct {
	Scope       policy.Scope       `json:"scope"`
	ScopeRef    string             `json:"scope_ref,omitempty"`
	MatcherType policy.MatcherType `json:"matcher_type"`
	Pattern     string             `json:"pattern"`
	Mode        policy.IgnoreMode  `json:"mode"`
	Note        string             `json:"note,omitempty"`
}

func decodeAddTrustedRuleInput(raw json.RawMessage) (any, error) {
	input, err := toolruntime.DecodeJSON[addTrustedRuleInput](raw)
	if err != nil {
		return nil, err
	}
	if err := validateAddTrustedRuleInput(input); err != nil {
		return nil, err
	}
	return input, nil
}

func validateAddTrustedRuleInput(input addTrustedRuleInput) error {
	if input.Scope != policy.ScopeGlobal && input.Scope != policy.ScopeWorkspace && input.Scope != policy.ScopeRepo {
		return toolruntime.InvalidInputError("trusted rule scope is required")
	}
	switch input.SubjectType {
	case policy.SubjectTool, policy.SubjectCommand, policy.SubjectPath:
	default:
		return toolruntime.InvalidInputError("trusted rule subject_type is required")
	}
	switch input.MatcherType {
	case policy.MatcherExact, policy.MatcherGlob, policy.MatcherRegex:
		if strings.TrimSpace(input.Matcher) == "" {
			return toolruntime.InvalidInputError("trusted rule matcher is required")
		}
	case policy.MatcherStructured:
		if input.Structured == nil {
			return toolruntime.InvalidInputError("trusted rule structured payload is required")
		}
	default:
		return toolruntime.InvalidInputError("trusted rule matcher_type is required")
	}
	return nil
}

func decodeAddIgnoreRuleInput(raw json.RawMessage) (any, error) {
	input, err := toolruntime.DecodeJSON[addIgnoreRuleInput](raw)
	if err != nil {
		return nil, err
	}
	if err := validateAddIgnoreRuleInput(input); err != nil {
		return nil, err
	}
	return input, nil
}

func validateAddIgnoreRuleInput(input addIgnoreRuleInput) error {
	if input.Scope != policy.ScopeGlobal && input.Scope != policy.ScopeWorkspace && input.Scope != policy.ScopeRepo {
		return toolruntime.InvalidInputError("ignore rule scope is required")
	}
	switch input.MatcherType {
	case policy.MatcherExact, policy.MatcherGlob, policy.MatcherRegex:
	default:
		return toolruntime.InvalidInputError("ignore rule matcher_type is required")
	}
	if strings.TrimSpace(input.Pattern) == "" {
		return toolruntime.InvalidInputError("ignore rule pattern is required")
	}
	switch input.Mode {
	case policy.IgnoreModeDeny, policy.IgnoreModeMetadataOnly, policy.IgnoreModeRedact:
	default:
		return toolruntime.InvalidInputError("ignore rule mode is required")
	}
	return nil
}

func (r *Runtime) registerTools() error {
	for _, register := range []func() []toolruntime.Definition{
		r.workspaceTools,
		r.terminalTools,
		r.connectionTools,
		r.policyTools,
	} {
		for _, tool := range register() {
			if err := r.Registry.Register(tool); err != nil {
				return err
			}
		}
	}
	return nil
}

func (r *Runtime) resolveWidgetID(widgetID string) (string, error) {
	if widgetID != "" {
		return widgetID, nil
	}
	active, err := r.Workspace.ActiveWidget()
	if err != nil {
		return "", err
	}
	return active.ID, nil
}

func (r *Runtime) normalizeScopeRef(scope policy.Scope, scopeRef string, execCtx toolruntime.ExecutionContext) string {
	if scopeRef != "" {
		return scopeRef
	}
	switch scope {
	case policy.ScopeRepo:
		return r.RepoRoot
	case policy.ScopeWorkspace:
		if execCtx.WorkspaceID != "" {
			return execCtx.WorkspaceID
		}
		return r.Workspace.Snapshot().ID
	default:
		return ""
	}
}

func trimSummary(text string) string {
	text = strings.TrimSpace(text)
	if text == "" {
		return "<empty>"
	}
	if len(text) > 60 {
		return text[:57] + "..."
	}
	return text
}
