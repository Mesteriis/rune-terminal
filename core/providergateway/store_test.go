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
		ProviderID:             "codex-cli",
		ProviderKind:           "codex",
		ProviderDisplayName:    "Codex CLI",
		RequestMode:            RunModeStream,
		Model:                  "gpt-5.4",
		ConversationID:         "conv-1",
		Status:                 RunStatusSucceeded,
		DurationMS:             420,
		FirstResponseLatencyMS: 120,
		StartedAt:              firstStartedAt,
		CompletedAt:            firstStartedAt.Add(420 * time.Millisecond),
	}); err != nil {
		t.Fatalf("RecordRun first error: %v", err)
	}

	if _, err := store.RecordRun(context.Background(), RunRecord{
		ProviderID:             "codex-cli",
		ProviderKind:           "codex",
		ProviderDisplayName:    "Codex CLI",
		RequestMode:            RunModeSync,
		Model:                  "gpt-5.4",
		ConversationID:         "conv-1",
		Status:                 RunStatusFailed,
		ErrorCode:              "provider_error",
		ErrorMessage:           "upstream timeout",
		DurationMS:             880,
		FirstResponseLatencyMS: 410,
		StartedAt:              secondStartedAt,
		CompletedAt:            secondStartedAt.Add(880 * time.Millisecond),
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
	if runs[0].FirstResponseLatencyMS != 410 {
		t.Fatalf("expected latest run first-response latency, got %#v", runs[0])
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
			ProviderID:             "codex-cli",
			ProviderKind:           "codex",
			ProviderDisplayName:    "Codex CLI",
			RequestMode:            RunModeStream,
			Model:                  "gpt-5.4",
			Status:                 RunStatusSucceeded,
			DurationMS:             300,
			FirstResponseLatencyMS: 90,
			StartedAt:              baseTime,
			CompletedAt:            baseTime.Add(300 * time.Millisecond),
		},
		{
			ProviderID:             "codex-cli",
			ProviderKind:           "codex",
			ProviderDisplayName:    "Codex CLI",
			RequestMode:            RunModeStream,
			Model:                  "gpt-5.4",
			Status:                 RunStatusCancelled,
			ErrorCode:              "stream_cancelled",
			ErrorMessage:           "conversation stream cancelled",
			DurationMS:             100,
			FirstResponseLatencyMS: 40,
			StartedAt:              baseTime.Add(1 * time.Minute),
			CompletedAt:            baseTime.Add(1*time.Minute + 100*time.Millisecond),
		},
		{
			ProviderID:             "claude-cli",
			ProviderKind:           "claude",
			ProviderDisplayName:    "Claude Code CLI",
			RequestMode:            RunModeSync,
			Model:                  "sonnet",
			Status:                 RunStatusFailed,
			ErrorCode:              "provider_error",
			ErrorMessage:           "cli unavailable",
			DurationMS:             700,
			FirstResponseLatencyMS: 0,
			StartedAt:              baseTime.Add(2 * time.Minute),
			CompletedAt:            baseTime.Add(2*time.Minute + 700*time.Millisecond),
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
	if stats[1].AverageFirstResponseLatencyMS != 65 || stats[1].LastFirstResponseLatencyMS != 40 {
		t.Fatalf("unexpected codex first-response stats: %#v", stats[1])
	}
}

func TestStoreRecordsAndListsLatestProbes(t *testing.T) {
	t.Parallel()

	dbConn, err := coredb.Open(context.Background(), filepath.Join(t.TempDir(), "runtime.db"))
	if err != nil {
		t.Fatalf("coredb.Open error: %v", err)
	}

	store, err := NewStore(context.Background(), dbConn)
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}

	firstCheckedAt := time.Date(2026, 4, 26, 12, 0, 0, 0, time.UTC)
	secondCheckedAt := firstCheckedAt.Add(3 * time.Minute)

	if _, err := store.RecordProbe(context.Background(), ProbeRecord{
		ProviderID:     "codex-cli",
		ProviderKind:   "codex",
		DisplayName:    "Codex CLI",
		Ready:          false,
		StatusState:    "auth-required",
		StatusMessage:  "Codex CLI is installed but not logged in.",
		ResolvedBinary: "/usr/local/bin/codex",
		Model:          "gpt-5.4",
		ProbeLatencyMS: 120,
		CheckedAt:      firstCheckedAt,
	}); err != nil {
		t.Fatalf("RecordProbe first error: %v", err)
	}

	if _, err := store.RecordProbe(context.Background(), ProbeRecord{
		ProviderID:     "codex-cli",
		ProviderKind:   "codex",
		DisplayName:    "Codex CLI",
		Ready:          true,
		StatusState:    "ready",
		StatusMessage:  "Codex CLI is authenticated.",
		ResolvedBinary: "/opt/homebrew/bin/codex",
		Model:          "gpt-5.4",
		ProbeLatencyMS: 80,
		CheckedAt:      secondCheckedAt,
	}); err != nil {
		t.Fatalf("RecordProbe second error: %v", err)
	}

	probes, err := store.ListLatestProbes(context.Background())
	if err != nil {
		t.Fatalf("ListLatestProbes error: %v", err)
	}
	if len(probes) != 1 {
		t.Fatalf("expected 1 probe row, got %d", len(probes))
	}
	if !probes[0].Ready || probes[0].StatusState != "ready" {
		t.Fatalf("expected latest ready probe, got %#v", probes[0])
	}
	if probes[0].ResolvedBinary != "/opt/homebrew/bin/codex" || probes[0].ProbeLatencyMS != 80 {
		t.Fatalf("unexpected latest probe payload: %#v", probes[0])
	}
}

func TestStoreRecordsAndListsLatestPrepareState(t *testing.T) {
	t.Parallel()

	dbConn, err := coredb.Open(context.Background(), filepath.Join(t.TempDir(), "runtime.db"))
	if err != nil {
		t.Fatalf("coredb.Open error: %v", err)
	}

	store, err := NewStore(context.Background(), dbConn)
	if err != nil {
		t.Fatalf("NewStore error: %v", err)
	}

	checkedAt := time.Date(2026, 4, 26, 12, 0, 0, 0, time.UTC)
	preparedAt := checkedAt.Add(2 * time.Minute)

	if _, err := store.RecordProbe(context.Background(), ProbeRecord{
		ProviderID:     "codex-cli",
		ProviderKind:   "codex",
		DisplayName:    "Codex CLI",
		Ready:          true,
		StatusState:    "ready",
		StatusMessage:  "Codex CLI is authenticated.",
		ResolvedBinary: "/opt/homebrew/bin/codex",
		Model:          "gpt-5.4",
		ProbeLatencyMS: 80,
		CheckedAt:      checkedAt,
	}); err != nil {
		t.Fatalf("RecordProbe error: %v", err)
	}

	if _, err := store.RecordPrepare(context.Background(), ProbeRecord{
		ProviderID:       "codex-cli",
		ProviderKind:     "codex",
		DisplayName:      "Codex CLI",
		ResolvedBinary:   "/opt/homebrew/bin/codex",
		Model:            "gpt-5.4",
		Prepared:         true,
		PrepareState:     "prepared",
		PrepareMessage:   "Codex CLI route verified and ready for on-demand launch.",
		PrepareLatencyMS: 42,
		CheckedAt:        checkedAt,
		PreparedAt:       &preparedAt,
	}); err != nil {
		t.Fatalf("RecordPrepare error: %v", err)
	}

	probes, err := store.ListLatestProbes(context.Background())
	if err != nil {
		t.Fatalf("ListLatestProbes error: %v", err)
	}
	if len(probes) != 1 {
		t.Fatalf("expected 1 probe row, got %d", len(probes))
	}
	if !probes[0].Prepared || probes[0].PrepareState != "prepared" {
		t.Fatalf("expected prepared route state, got %#v", probes[0])
	}
	if probes[0].PrepareLatencyMS != 42 || probes[0].PreparedAt == nil || !probes[0].PreparedAt.Equal(preparedAt) {
		t.Fatalf("unexpected prepare payload: %#v", probes[0])
	}
	if probes[0].StatusState != "ready" {
		t.Fatalf("expected original probe state to remain intact, got %#v", probes[0])
	}
}
