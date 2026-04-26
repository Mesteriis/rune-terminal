package app

import (
	"context"
	"errors"
	"testing"

	"github.com/Mesteriis/rune-terminal/core/agent"
	"github.com/Mesteriis/rune-terminal/core/conversation"
	"github.com/Mesteriis/rune-terminal/core/providergateway"
)

func TestClassifyProviderRunOutcomeUsesSpecificErrorCodes(t *testing.T) {
	t.Parallel()

	binding := resolvedConversationProvider{
		Record: &agent.ProviderRecord{
			ID:          "codex-cli",
			Kind:        agent.ProviderKindCodex,
			DisplayName: "Codex CLI",
		},
	}

	testCases := []struct {
		name              string
		callErr           error
		result            conversation.SubmitResult
		expectedStatus    string
		expectedErrorCode string
	}{
		{
			name:              "cancelled stream",
			callErr:           context.Canceled,
			expectedStatus:    providergateway.RunStatusCancelled,
			expectedErrorCode: "stream_cancelled",
		},
		{
			name:              "missing binary",
			callErr:           errors.New("exec: \"codex\": executable file not found in $PATH"),
			expectedStatus:    providergateway.RunStatusFailed,
			expectedErrorCode: "missing_binary",
		},
		{
			name:              "auth required",
			callErr:           errors.New("codex cli failed: exit status 1: not logged in"),
			expectedStatus:    providergateway.RunStatusFailed,
			expectedErrorCode: "auth_required",
		},
		{
			name:              "timeout",
			callErr:           context.DeadlineExceeded,
			expectedStatus:    providergateway.RunStatusFailed,
			expectedErrorCode: "timeout",
		},
		{
			name:              "unreachable",
			callErr:           errors.New("openai-compatible request failed (500): dial tcp 127.0.0.1:8317: connect: connection refused"),
			expectedStatus:    providergateway.RunStatusFailed,
			expectedErrorCode: "unreachable",
		},
		{
			name:              "model unavailable",
			callErr:           errors.New("openai-compatible request failed (404): model gpt-6 does not exist"),
			expectedStatus:    providergateway.RunStatusFailed,
			expectedErrorCode: "model_unavailable",
		},
		{
			name:              "invalid config",
			callErr:           errors.New("openai-compatible model is required"),
			expectedStatus:    providergateway.RunStatusFailed,
			expectedErrorCode: "invalid_config",
		},
		{
			name:              "upstream rejected",
			callErr:           errors.New("openai-compatible request failed (429): rate limit exceeded"),
			expectedStatus:    providergateway.RunStatusFailed,
			expectedErrorCode: "upstream_rejected",
		},
		{
			name: "provider error from result",
			result: conversation.SubmitResult{
				ProviderError: "upstream returned an unknown failure",
			},
			expectedStatus:    providergateway.RunStatusFailed,
			expectedErrorCode: providerRunErrorCodeGeneric,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			status, errorCode, _ := classifyProviderRunOutcome(binding, tc.result, tc.callErr)
			if status != tc.expectedStatus || errorCode != tc.expectedErrorCode {
				t.Fatalf("expected (%s, %s), got (%s, %s)", tc.expectedStatus, tc.expectedErrorCode, status, errorCode)
			}
		})
	}
}
