package app

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/avm/rterm/core/policy"
	"github.com/avm/rterm/core/toolruntime"
)

func (r *Runtime) policyTools() []toolruntime.Definition {
	return []toolruntime.Definition{
		r.safetyConfirmTool(),
		r.addTrustedRuleTool(),
		r.listTrustedRulesTool(),
		r.removeTrustedRuleTool(),
		r.addIgnoreRuleTool(),
		r.listIgnoreRulesTool(),
		r.removeIgnoreRuleTool(),
	}
}

func (r *Runtime) safetyConfirmTool() toolruntime.Definition {
	return toolruntime.Definition{
		Name:         "safety.confirm",
		Description:  "Confirm a pending approval and return a short-lived approval token.",
		InputSchema:  json.RawMessage(`{"type":"object","properties":{"approval_id":{"type":"string"}},"required":["approval_id"],"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"policy:write"},
			ApprovalTier: policy.ApprovalTierSafe,
			TargetKind:   toolruntime.TargetPolicy,
		},
		Decode: func(raw json.RawMessage) (any, error) {
			return toolruntime.DecodeJSON[confirmInput](raw)
		},
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              "confirm pending approval",
					RequiredCapabilities: []string{"policy:write"},
					ApprovalTier:         policy.ApprovalTierSafe,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			return r.Executor.Confirm(input.(confirmInput).ApprovalID)
		},
	}
}

func (r *Runtime) addTrustedRuleTool() toolruntime.Definition {
	return toolruntime.Definition{
		Name:         "safety.add_trusted_rule",
		Description:  "Add a trusted allowlist rule.",
		InputSchema:  json.RawMessage(`{"type":"object"}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"policy:write"},
			ApprovalTier: policy.ApprovalTierDangerous,
			Mutating:     true,
			TargetKind:   toolruntime.TargetPolicy,
		},
		Decode: func(raw json.RawMessage) (any, error) {
			return toolruntime.DecodeJSON[addTrustedRuleInput](raw)
		},
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			payload := input.(addTrustedRuleInput)
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              fmt.Sprintf("add trusted rule %s (%s)", payload.MatcherType, payload.Scope),
					RequiredCapabilities: []string{"policy:write"},
					ApprovalTier:         policy.ApprovalTierDangerous,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			payload := input.(addTrustedRuleInput)
			return r.Policy.AddTrustedRule(policy.TrustedRule{
				Scope:       payload.Scope,
				ScopeRef:    r.normalizeScopeRef(payload.Scope, payload.ScopeRef, execCtx),
				SubjectType: payload.SubjectType,
				MatcherType: payload.MatcherType,
				Matcher:     payload.Matcher,
				Structured:  payload.Structured,
				Note:        payload.Note,
			})
		},
	}
}

func (r *Runtime) listTrustedRulesTool() toolruntime.Definition {
	return toolruntime.Definition{
		Name:         "safety.list_trusted_rules",
		Description:  "List trusted allowlist rules.",
		InputSchema:  json.RawMessage(`{"type":"object","properties":{},"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"policy:read"},
			ApprovalTier: policy.ApprovalTierSafe,
			TargetKind:   toolruntime.TargetPolicy,
		},
		Decode: toolruntime.EmptyDecode,
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              "list trusted rules",
					RequiredCapabilities: []string{"policy:read"},
					ApprovalTier:         policy.ApprovalTierSafe,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			return map[string]any{"rules": r.Policy.ListTrustedRules()}, nil
		},
	}
}

func (r *Runtime) removeTrustedRuleTool() toolruntime.Definition {
	return toolruntime.Definition{
		Name:         "safety.remove_trusted_rule",
		Description:  "Remove a trusted allowlist rule.",
		InputSchema:  json.RawMessage(`{"type":"object","properties":{"rule_id":{"type":"string"}},"required":["rule_id"],"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"policy:write"},
			ApprovalTier: policy.ApprovalTierDangerous,
			Mutating:     true,
			TargetKind:   toolruntime.TargetPolicy,
		},
		Decode: func(raw json.RawMessage) (any, error) {
			return toolruntime.DecodeJSON[removeRuleInput](raw)
		},
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              "remove trusted rule " + input.(removeRuleInput).RuleID,
					RequiredCapabilities: []string{"policy:write"},
					ApprovalTier:         policy.ApprovalTierDangerous,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			payload := input.(removeRuleInput)
			removed, err := r.Policy.RemoveTrustedRule(payload.RuleID)
			if err != nil {
				return nil, err
			}
			return map[string]any{"removed": removed, "rule_id": payload.RuleID}, nil
		},
	}
}

func (r *Runtime) addIgnoreRuleTool() toolruntime.Definition {
	return toolruntime.Definition{
		Name:         "safety.add_ignore_rule",
		Description:  "Add an ignore rule for secrets or restricted paths.",
		InputSchema:  json.RawMessage(`{"type":"object"}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"policy:write"},
			ApprovalTier: policy.ApprovalTierDangerous,
			Mutating:     true,
			TargetKind:   toolruntime.TargetPolicy,
		},
		Decode: func(raw json.RawMessage) (any, error) {
			return toolruntime.DecodeJSON[addIgnoreRuleInput](raw)
		},
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			payload := input.(addIgnoreRuleInput)
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              fmt.Sprintf("add ignore rule %s (%s)", payload.Pattern, payload.Mode),
					RequiredCapabilities: []string{"policy:write"},
					ApprovalTier:         policy.ApprovalTierDangerous,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			payload := input.(addIgnoreRuleInput)
			return r.Policy.AddIgnoreRule(policy.IgnoreRule{
				Scope:       payload.Scope,
				ScopeRef:    r.normalizeScopeRef(payload.Scope, payload.ScopeRef, execCtx),
				MatcherType: payload.MatcherType,
				Pattern:     payload.Pattern,
				Mode:        payload.Mode,
				Note:        payload.Note,
			})
		},
	}
}

func (r *Runtime) listIgnoreRulesTool() toolruntime.Definition {
	return toolruntime.Definition{
		Name:         "safety.list_ignore_rules",
		Description:  "List ignore and secret protection rules.",
		InputSchema:  json.RawMessage(`{"type":"object","properties":{},"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"policy:read"},
			ApprovalTier: policy.ApprovalTierSafe,
			TargetKind:   toolruntime.TargetPolicy,
		},
		Decode: toolruntime.EmptyDecode,
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              "list ignore rules",
					RequiredCapabilities: []string{"policy:read"},
					ApprovalTier:         policy.ApprovalTierSafe,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			return map[string]any{"rules": r.Policy.ListIgnoreRules()}, nil
		},
	}
}

func (r *Runtime) removeIgnoreRuleTool() toolruntime.Definition {
	return toolruntime.Definition{
		Name:         "safety.remove_ignore_rule",
		Description:  "Remove an ignore rule.",
		InputSchema:  json.RawMessage(`{"type":"object","properties":{"rule_id":{"type":"string"}},"required":["rule_id"],"additionalProperties":false}`),
		OutputSchema: json.RawMessage(`{"type":"object"}`),
		Metadata: toolruntime.Metadata{
			Capabilities: []string{"policy:write"},
			ApprovalTier: policy.ApprovalTierDangerous,
			Mutating:     true,
			TargetKind:   toolruntime.TargetPolicy,
		},
		Decode: func(raw json.RawMessage) (any, error) {
			return toolruntime.DecodeJSON[removeRuleInput](raw)
		},
		Plan: func(input any, execCtx toolruntime.ExecutionContext) (toolruntime.OperationPlan, error) {
			return toolruntime.OperationPlan{
				Operation: toolruntime.Operation{
					Summary:              "remove ignore rule " + input.(removeRuleInput).RuleID,
					RequiredCapabilities: []string{"policy:write"},
					ApprovalTier:         policy.ApprovalTierDangerous,
				},
			}, nil
		},
		Execute: func(ctx context.Context, execCtx toolruntime.ExecutionContext, input any) (any, error) {
			payload := input.(removeRuleInput)
			removed, err := r.Policy.RemoveIgnoreRule(payload.RuleID)
			if err != nil {
				return nil, err
			}
			return map[string]any{"removed": removed, "rule_id": payload.RuleID}, nil
		},
	}
}
