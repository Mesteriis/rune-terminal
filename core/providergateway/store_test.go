package providergateway

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	coredb "github.com/Mesteriis/rune-terminal/core/db"
)

func TestStoreRecordsRunsAndListsRecentRuns(t *testing.T) {
	t.Parallel()

	dbConn, err := coredb.Open(context.Background(), filepath.Join(t.TempDir(), "runtime.db"))
	if err != nil {
		t.Fatalf("coredb.Open error: %v", err)
	}

	store, err := NewStore(context.Background(), dbConn)
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}

	firstStartedAt := time.Date(2026, 4, 26, 10, 0, 0, 0, time.UTC)
	secondStartedAt := firstStartedAt.Add(5 * time.Minute)

	if _, err := store.RecordRun(context.Background(), RunRecord{
		ProviderID:          "codex-cli",
		ProviderKind:        "codex",
		ProviderDisplayName: "Codex CLI",
		RequestMode:         RunModeStream,
		Model:               "gpt-5.4",
		ConversationID:      "conv-1",
		Status:              RunStatusSucceeded,
		DurationMS:          420,
		StartedAt:           firstStartedAt,
		CompletedAt:         firstStartedAt.Add(420 * time.Millisecond),
	}); err != nil {
		t.Fatalf("RecordRun first error: %v", err)
	}

	if _, err := store.RecordRun(context.Background(), RunRecord{
		ProviderID:          "codex-cli",
		ProviderKind:        "codex",
		ProviderDisplayName: "Codex CLI",
		RequestMode:         RunModeSync,
		Model:               "gpt-5.4",
		ConversationID:      "conv-1",
		Status:              RunStatusFailed,
		ErrorCode:           "provider_error",
		ErrorMessage:        "upstream timeout",
		DurationMS:          880,
		StartedAt:           secondStartedAt,
		CompletedAt:         secondStartedAt.Add(880 * time.Millisecond),
	}); err != nil {
		t.Fatalf("RecordRun second error: %v", err)
	}

	runs, err := store.ListRecentRuns(context.Background(), 10)
	if err != nil {
		t.Fatalf("ListRecentRuns error: %v", err)
	}
	if len(runs) != 2 {
		t.Fatalf("expected 2 runs, got %d", len(runs))
	}
	if runs[0].Status != RunStatusFailed || runs[0].ErrorMessage != "upstream timeout" {
		t.Fatalf("expected latest failed run first, got %#v", runs[0])
	}
	if runs[1].Status != RunStatusSucceeded || runs[1].ErrorMessage != "" {
		t.Fatalf("expected earlier succeeded run second, got %#v", runs[1])
	}
}

func TestStoreListsProviderStats(t *testing.T) {
	t.Parallel()

	dbConn, err := coredb.Open(context.Background(), filepath.Join(t.TempDir(), "runtime.db"))
	if err != nil {
		t.Fatalf("coredb.Open error: %v", err)
	}

	store, err := NewStore(context.Background(), dbConn)
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}

	baseTime := time.Date(2026, 4, 26, 10, 0, 0, 0, time.UTC)
	records := []RunRecord{
		{
			ProviderID:          "codex-cli",
			ProviderKind:        "codex",
			ProviderDisplayName: "Codex CLI",
			RequestMode:         RunModeStream,
			Model:               "gpt-5.4",
			Status:              RunStatusSucceeded,
			DurationMS:          300,
			StartedAt:           baseTime,
			CompletedAt:         baseTime.Add(300 * time.Millisecond),
		},
		{
			ProviderID:          "codex-cli",
			ProviderKind:        "codex",
			ProviderDisplayName: "Codex CLI",
			RequestMode:         RunModeStream,
			Model:               "gpt-5.4",
			Status:              RunStatusCancelled,
			ErrorCode:           "stream_cancelled",
			ErrorMessage:        "conversation stream cancelled",
			DurationMS:          100,
			StartedAt:           baseTime.Add(1 * time.Minute),
			CompletedAt:         baseTime.Add(1*time.Minute + 100*time.Millisecond),
		},
		{
			ProviderID:          "claude-cli",
			ProviderKind:        "claude",
			ProviderDisplayName: "Claude Code CLI",
			RequestMode:         RunModeSync,
			Model:               "sonnet",
			Status:              RunStatusFailed,
			ErrorCode:           "provider_error",
			ErrorMessage:        "cli unavailable",
			DurationMS:          700,
			StartedAt:           baseTime.Add(2 * time.Minute),
			CompletedAt:         baseTime.Add(2*time.Minute + 700*time.Millisecond),
		},
	}
	for _, record := range records {
		if _, err := store.RecordRun(context.Background(), record); err != nil {
			t.Fatalf("RecordRun error: %v", err)
		}
	}

	stats, err := store.ListProviderStats(context.Background())
	if err != nil {
		t.Fatalf("ListProviderStats error: %v", err)
	}
	if len(stats) != 2 {
		t.Fatalf("expected 2 provider stats rows, got %d", len(stats))
	}
	if stats[0].ProviderID != "claude-cli" || stats[0].LastStatus != RunStatusFailed {
		t.Fatalf("expected latest provider stats first, got %#v", stats[0])
	}
	if stats[1].ProviderID != "codex-cli" || stats[1].SucceededRuns != 1 || stats[1].CancelledRuns != 1 {
		t.Fatalf("unexpected codex stats: %#v", stats[1])
	}
	if stats[1].AverageDurationMS != 200 {
		t.Fatalf("expected codex avg 200ms, got %#v", stats[1])
	}
}
