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
