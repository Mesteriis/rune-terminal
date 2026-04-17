package toolruntime

import (
	"errors"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/policy"
)

type preparedExecution struct {
	envelope             ExecutionEnvelope
	execContext          ExecutionContext
	profile              policy.EvaluationProfile
	definition           Definition
	input                any
	plan                 OperationPlan
	decision             policy.Decision
	hasApproval          bool
	intentKey            string
	approvalVerification approvalVerificationResult
}

func (e *Executor) prepare(request ExecuteRequest, profile policy.EvaluationProfile) (*preparedExecution, *ExecuteResponse) {
	envelope := executionEnvelopeFromRequest(request, profile)
	execContext := envelope.executionContext()

	definition, ok := e.registry.Get(envelope.ToolName)
	if !ok {
		return nil, &ExecuteResponse{Status: "error", Error: "tool not found", ErrorCode: ErrorCodeNotFound}
	}
	if err := validateDefinitionContext(definition, execContext); err != nil {
		return nil, &ExecuteResponse{Status: "error", Error: err.Error(), ErrorCode: ErrorCodeInvalidInput, Tool: toolInfo(definition)}
	}

	input, err := definition.Decode(envelope.Input)
	if err != nil {
		return nil, &ExecuteResponse{Status: "error", Error: err.Error(), ErrorCode: ErrorCodeInvalidInput, Tool: toolInfo(definition)}
	}

	plan, err := definition.Plan(input, execContext)
	if err != nil {
		return nil, &ExecuteResponse{Status: "error", Error: err.Error(), ErrorCode: ErrorCodeInvalidInput, Tool: toolInfo(definition)}
	}
	plan.RequiredCapabilities = append(plan.RequiredCapabilities, definition.Metadata.Capabilities...)
	plan.RequiredCapabilities = uniqueStrings(plan.RequiredCapabilities)
	if plan.ApprovalTier == "" {
		plan.ApprovalTier = definition.Metadata.ApprovalTier
	}

	intentKey, err := executionIntentHash(envelope, input)
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

	decision := policy.Evaluate(e.policy.Snapshot(), policy.Context{
		ToolName:             definition.Name,
		Summary:              plan.Summary,
		WorkspaceID:          envelope.Context.WorkspaceID,
		RepoRoot:             envelope.Context.RepoRoot,
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
		envelope:             envelope,
		execContext:          execContext,
		profile:              profile,
		definition:           definition,
		input:                input,
		plan:                 plan,
		decision:             decision,
		hasApproval:          hasApproval,
		intentKey:            intentKey,
		approvalVerification: approvalVerification,
	}, nil
}

func validateDefinitionContext(definition Definition, execContext ExecutionContext) error {
	if !definition.IsPluginBacked() {
		return nil
	}
	if strings.TrimSpace(execContext.WorkspaceID) == "" {
		return InvalidInputError("context.workspace_id is required for plugin tools")
	}
	if strings.TrimSpace(execContext.TargetSession) != "" || strings.TrimSpace(execContext.TargetConnectionID) != "" {
		return InvalidInputError("terminal target context is not allowed for plugin tools")
	}
	return nil
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
