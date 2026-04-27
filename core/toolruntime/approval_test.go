package toolruntime

import (
	"testing"
	"time"

	"github.com/Mesteriis/rune-terminal/core/policy"
)

func TestApprovalStoreCreateCleansExpiredGrants(t *testing.T) {
	t.Parallel()

	store := newApprovalStore()
	store.grants["expired"] = approvalGrantRecord{
		grant: ApprovalGrant{
			Token:     "expired",
			ExpiresAt: time.Now().UTC().Add(-time.Minute),
		},
		intentKey: "intent",
	}

	store.Create("tool.read", "read tool", policy.ApprovalTierSafe, "intent")

	if _, ok := store.grants["expired"]; ok {
		t.Fatal("expected expired grant to be cleaned up on create")
	}
}

func TestApprovalStoreConfirmCleansExpiredPendingRecords(t *testing.T) {
	t.Parallel()

	store := newApprovalStore()
	store.pending["expired"] = pendingApprovalRecord{
		approval: PendingApproval{
			ID:           "expired",
			ToolName:     "tool.write",
			ApprovalTier: policy.ApprovalTierDangerous,
			CreatedAt:    time.Now().UTC().Add(-time.Hour),
			ExpiresAt:    time.Now().UTC().Add(-time.Minute),
		},
		intentKey: "intent",
	}

	approval := store.Create("tool.write", "write tool", policy.ApprovalTierDangerous, "intent")
	if _, err := store.Confirm(approval.ID); err != nil {
		t.Fatalf("Confirm error: %v", err)
	}

	if _, ok := store.pending["expired"]; ok {
		t.Fatal("expected expired pending approval to be cleaned up on confirm path")
	}
}
