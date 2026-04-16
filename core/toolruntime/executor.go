package toolruntime

import (
	"context"

	"github.com/Mesteriis/rune-terminal/core/audit"
	"github.com/Mesteriis/rune-terminal/core/policy"
)

type PolicyProfileProvider interface {
	PolicyProfile() policy.EvaluationProfile
}

type Executor struct {
	registry  *Registry
	policy    *policy.Store
	audit     *audit.Log
	approvals *approvalStore
	profiles  PolicyProfileProvider
}

func NewExecutor(registry *Registry, policyStore *policy.Store, auditLog *audit.Log, profiles PolicyProfileProvider) *Executor {
	return &Executor{
		registry:  registry,
		policy:    policyStore,
		audit:     auditLog,
		approvals: newApprovalStore(),
		profiles:  profiles,
	}
}

func (e *Executor) Confirm(id string) (ApprovalGrant, error) {
	return e.approvals.Confirm(id)
}

func (e *Executor) Execute(ctx context.Context, request ExecuteRequest) ExecuteResponse {
	prepared, response := e.prepare(request)
	if response != nil {
		return *response
	}

	if prepared.approvalVerification == approvalVerificationMismatch {
		errorText := "approval token does not match the requested execution intent"
		e.appendAudit(prepared, request, false, errorText)
		return ExecuteResponse{
			Status:    "error",
			Error:     errorText,
			ErrorCode: ErrorCodeApprovalMismatch,
			Tool:      toolInfo(prepared.definition),
			Operation: &prepared.plan.Operation,
		}
	}

	if prepared.decision.RequiresConfirmation {
		pending := e.approvals.Create(
			prepared.definition.Name,
			prepared.plan.Summary,
			prepared.decision.EffectiveApprovalTier,
			prepared.intentKey,
		)
		e.appendAudit(prepared, request, false, prepared.decision.Reason)
		return ExecuteResponse{
			Status:          "requires_confirmation",
			ErrorCode:       ErrorCodeApprovalRequired,
			Tool:            toolInfo(prepared.definition),
			Operation:       &prepared.plan.Operation,
			PendingApproval: &pending,
		}
	}

	if !prepared.decision.Allowed {
		e.appendAudit(prepared, request, false, prepared.decision.Reason)
		return ExecuteResponse{
			Status:    "error",
			Error:     prepared.decision.Reason,
			ErrorCode: ErrorCodePolicyDenied,
			Tool:      toolInfo(prepared.definition),
			Operation: &prepared.plan.Operation,
		}
	}

	output, err := prepared.definition.Execute(ctx, request.Context, prepared.input)
	if err != nil {
		code := ErrorCodeOf(err)
		message := ErrorMessageOf(err)
		e.appendAudit(prepared, request, false, err.Error())
		return ExecuteResponse{
			Status:    "error",
			Error:     message,
			ErrorCode: code,
			Tool:      toolInfo(prepared.definition),
			Operation: &prepared.plan.Operation,
		}
	}

	e.appendAudit(prepared, request, true, "")
	return ExecuteResponse{
		Status:    "ok",
		Output:    output,
		Tool:      toolInfo(prepared.definition),
		Operation: &prepared.plan.Operation,
	}
}

func toolInfo(definition Definition) *ToolInfo {
	return &ToolInfo{
		Name:         definition.Name,
		Description:  definition.Description,
		InputSchema:  definition.InputSchema,
		OutputSchema: definition.OutputSchema,
		Metadata:     definition.Metadata,
	}
}
