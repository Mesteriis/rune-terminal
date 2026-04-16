package toolruntime

import (
	"errors"

	"github.com/Mesteriis/rune-terminal/core/policy"
)

type preparedExecution struct {
	definition           Definition
	input                any
	plan                 OperationPlan
	decision             policy.Decision
	hasApproval          bool
	intentKey            string
	approvalVerification approvalVerificationResult
}

func (e *Executor) prepare(request ExecuteRequest) (*preparedExecution, *ExecuteResponse) {
	definition, ok := e.registry.Get(request.ToolName)
	if !ok {
		return nil, &ExecuteResponse{Status: "error", Error: "tool not found", ErrorCode: ErrorCodeNotFound}
	}

	input, err := definition.Decode(request.Input)
	if err != nil {
		return nil, &ExecuteResponse{Status: "error", Error: err.Error(), ErrorCode: ErrorCodeInvalidInput, Tool: toolInfo(definition)}
	}

	plan, err := definition.Plan(input, request.Context)
	if err != nil {
		return nil, &ExecuteResponse{Status: "error", Error: err.Error(), ErrorCode: ErrorCodeInvalidInput, Tool: toolInfo(definition)}
	}
	plan.RequiredCapabilities = append(plan.RequiredCapabilities, definition.Metadata.Capabilities...)
	plan.RequiredCapabilities = uniqueStrings(plan.RequiredCapabilities)
	if plan.ApprovalTier == "" {
		plan.ApprovalTier = definition.Metadata.ApprovalTier
	}

	intentKey, err := executionIntentHash(definition.Name, input, request.Context)
	if err != nil {
		return nil, &ExecuteResponse{
			Status:    "error",
			Error:     "failed to normalize execution intent",
			ErrorCode: ErrorCodeInternalError,
			Tool:      toolInfo(definition),
		}
	}

	approvalVerification := e.approvals.Verify(request.ApprovalToken, intentKey)
	hasApproval := approvalVerification == approvalVerificationGranted
	profile := policy.EvaluationProfile{}
	if e.profiles != nil {
		profile = e.profiles.PolicyProfile()
	}

	decision := policy.Evaluate(e.policy.Snapshot(), policy.Context{
		ToolName:             definition.Name,
		Summary:              plan.Summary,
		WorkspaceID:          request.Context.WorkspaceID,
		RepoRoot:             request.Context.RepoRoot,
		AffectedPaths:        plan.AffectedPaths,
		AffectedWidgets:      plan.AffectedWidgets,
		RequiredCapabilities: plan.RequiredCapabilities,
		ApprovalTier:         plan.ApprovalTier,
		Mutating:             definition.Metadata.Mutating,
		RequiresAllowedRoots: plan.RequiresAllowedRoots,
		ChecksIgnoreRules:    plan.ChecksIgnoreRules,
		HasApproval:          hasApproval,
		EvaluationProfile:    profile,
	})
	plan.ApprovalTier = decision.EffectiveApprovalTier
	return &preparedExecution{
		definition:           definition,
		input:                input,
		plan:                 plan,
		decision:             decision,
		hasApproval:          hasApproval,
		intentKey:            intentKey,
		approvalVerification: approvalVerification,
	}, nil
}

func RequireWidgetID(widgetID string) error {
	if widgetID == "" {
		return errors.New("widget_id is required")
	}
	return nil
}

func uniqueStrings(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}
