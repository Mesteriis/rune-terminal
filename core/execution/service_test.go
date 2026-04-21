package execution

import (
	"path/filepath"
	"testing"
)

func TestServiceAppendListAndGet(t *testing.T) {
	t.Parallel()

	service, err := NewService(filepath.Join(t.TempDir(), "execution-blocks.json"))
	if err != nil {
		t.Fatalf("NewService error: %v", err)
	}

	first, err := service.Append(Block{
		Intent: BlockIntent{
			Prompt:  "/run echo first",
			Command: "echo first",
		},
		Target: BlockTarget{
			WorkspaceID: "ws-a",
			WidgetID:    "term-main",
		},
		Result: BlockResult{
			State:         BlockStateExecuted,
			OutputExcerpt: "first",
			FromSeq:       4,
		},
		Explain: BlockExplain{
			State:     ExplainStateAvailable,
			MessageID: "msg_1",
			Summary:   "first summary",
		},
		Provenance: BlockProvenance{
			CommandAuditEventID: "audit_first",
		},
	})
	if err != nil {
		t.Fatalf("Append error: %v", err)
	}

	second, err := service.Append(Block{
		Intent: BlockIntent{
			Prompt:  "/run echo second",
			Command: "echo second",
		},
		Target: BlockTarget{
			WorkspaceID: "ws-b",
			WidgetID:    "term-side",
		},
		Result: BlockResult{
			State:         BlockStateFailed,
			OutputExcerpt: "failed",
		},
		Explain: BlockExplain{
			State: ExplainStateFailed,
			Error: "provider failed",
		},
	})
	if err != nil {
		t.Fatalf("Append error: %v", err)
	}

	if first.ID == "" || second.ID == "" {
		t.Fatalf("expected generated ids, got first=%q second=%q", first.ID, second.ID)
	}

	blocksAll := service.List("", 0)
	if len(blocksAll) != 2 {
		t.Fatalf("expected 2 blocks, got %d", len(blocksAll))
	}

	blocksWorkspaceA := service.List("ws-a", 0)
	if len(blocksWorkspaceA) != 1 || blocksWorkspaceA[0].ID != first.ID {
		t.Fatalf("expected ws-a block only, got %#v", blocksWorkspaceA)
	}

	latestOnly := service.List("", 1)
	if len(latestOnly) != 1 || latestOnly[0].ID != second.ID {
		t.Fatalf("expected latest block to be second, got %#v", latestOnly)
	}

	got, ok := service.Get(first.ID)
	if !ok {
		t.Fatal("expected block to be found")
	}
	if got.Provenance.CommandAuditEventID != "audit_first" {
		t.Fatalf("unexpected provenance: %#v", got.Provenance)
	}
}

func TestServiceReplace(t *testing.T) {
	t.Parallel()

	service, err := NewService(filepath.Join(t.TempDir(), "execution-blocks.json"))
	if err != nil {
		t.Fatalf("NewService error: %v", err)
	}

	appended, err := service.Append(Block{
		Intent: BlockIntent{
			Prompt:  "/run echo replace",
			Command: "echo replace",
		},
		Target: BlockTarget{
			WorkspaceID: "ws-a",
			WidgetID:    "term-main",
		},
		Result: BlockResult{
			State: BlockStateExecuted,
		},
		Explain: BlockExplain{
			State: ExplainStateFailed,
			Error: "provider failed",
		},
	})
	if err != nil {
		t.Fatalf("Append error: %v", err)
	}

	replaced, replacedOK, err := service.Replace(Block{
		ID: appended.ID,
		Intent: BlockIntent{
			Prompt:  appended.Intent.Prompt,
			Command: appended.Intent.Command,
		},
		Target: appended.Target,
		Result: BlockResult{
			State:         BlockStateExecuted,
			OutputExcerpt: "replace",
			FromSeq:       42,
		},
		Explain: BlockExplain{
			State:     ExplainStateAvailable,
			MessageID: "msg_replace",
			Summary:   "replace summary",
		},
		Provenance: BlockProvenance{
			CommandAuditEventID: "audit_cmd",
			ExplainAuditEventID: "audit_explain",
		},
	})
	if err != nil {
		t.Fatalf("Replace error: %v", err)
	}
	if !replacedOK {
		t.Fatal("expected replace to find existing block")
	}
	if replaced.ID != appended.ID {
		t.Fatalf("expected same id, got %q", replaced.ID)
	}
	if replaced.UpdatedAt.Before(appended.UpdatedAt) {
		t.Fatalf("expected updated timestamp to move forward, appended=%s replaced=%s", appended.UpdatedAt, replaced.UpdatedAt)
	}

	blocks := service.List("", 0)
	if len(blocks) != 1 {
		t.Fatalf("expected one block after replace, got %#v", blocks)
	}
	if blocks[0].Explain.MessageID != "msg_replace" {
		t.Fatalf("unexpected explain payload after replace: %#v", blocks[0].Explain)
	}
	if blocks[0].Provenance.ExplainAuditEventID != "audit_explain" {
		t.Fatalf("unexpected provenance after replace: %#v", blocks[0].Provenance)
	}

	_, missingOK, err := service.Replace(Block{ID: "execblk_missing"})
	if err != nil {
		t.Fatalf("replace missing returned error: %v", err)
	}
	if missingOK {
		t.Fatal("expected missing replace to report false")
	}
}

func TestServiceActiveCountAndMarkFailed(t *testing.T) {
	t.Parallel()

	service, err := NewService(filepath.Join(t.TempDir(), "execution-blocks-active.json"))
	if err != nil {
		t.Fatalf("NewService error: %v", err)
	}

	_, err = service.Append(Block{
		Intent: BlockIntent{
			Prompt:  "/run long running",
			Command: "sleep 10",
		},
		Target: BlockTarget{
			WorkspaceID: "ws-a",
		},
		Result: BlockResult{
			State: BlockStateRunning,
		},
	})
	if err != nil {
		t.Fatalf("Append error: %v", err)
	}

	if got := service.ActiveCount(); got != 1 {
		t.Fatalf("expected 1 active block, got %d", got)
	}

	marked, err := service.MarkActiveFailed("shutdown")
	if err != nil {
		t.Fatalf("MarkActiveFailed error: %v", err)
	}
	if marked != 1 {
		t.Fatalf("expected 1 marked block, got %d", marked)
	}
	if got := service.ActiveCount(); got != 0 {
		t.Fatalf("expected 0 active blocks after mark, got %d", got)
	}
}
