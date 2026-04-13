package app

import (
	"strings"

	"github.com/avm/rterm/core/policy"
	"github.com/avm/rterm/core/toolruntime"
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

type createTerminalTabInput struct {
	Title string `json:"title,omitempty"`
}

type closeTabInput struct {
	TabID string `json:"tab_id"`
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

func (r *Runtime) registerTools() error {
	for _, register := range []func() []toolruntime.Definition{
		r.workspaceTools,
		r.terminalTools,
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
