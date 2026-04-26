package app

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/Mesteriis/rune-terminal/core/agent"
	"github.com/Mesteriis/rune-terminal/core/conversation"
	"github.com/Mesteriis/rune-terminal/core/providergateway"
)

const (
	providerGatewayRecentRunsLimit = 20
	providerRunErrorCodeGeneric    = "provider_error"
)

type ProviderGatewayProviderView struct {
	ProviderID        string     `json:"provider_id"`
	ProviderKind      string     `json:"provider_kind"`
	DisplayName       string     `json:"display_name"`
	Enabled           bool       `json:"enabled"`
	Active            bool       `json:"active"`
	TotalRuns         int        `json:"total_runs"`
	SucceededRuns     int        `json:"succeeded_runs"`
	FailedRuns        int        `json:"failed_runs"`
	CancelledRuns     int        `json:"cancelled_runs"`
	AverageDurationMS int64      `json:"average_duration_ms"`
	LastDurationMS    int64      `json:"last_duration_ms"`
	LastStatus        string     `json:"last_status,omitempty"`
	LastErrorCode     string     `json:"last_error_code,omitempty"`
	LastErrorMessage  string     `json:"last_error_message,omitempty"`
	LastStartedAt     *time.Time `json:"last_started_at,omitempty"`
	LastCompletedAt   *time.Time `json:"last_completed_at,omitempty"`
}

type ProviderGatewaySnapshot struct {
	GeneratedAt time.Time                     `json:"generated_at"`
	Providers   []ProviderGatewayProviderView `json:"providers"`
	RecentRuns  []providergateway.RunRecord   `json:"recent_runs"`
}

type resolvedConversationProvider struct {
	Provider conversation.Provider
	Record   *agent.ProviderRecord
	Model    string
}

func (r *Runtime) ProviderGatewaySnapshot(ctx context.Context) (ProviderGatewaySnapshot, error) {
	catalog := r.ProviderCatalog()
	if r.ProviderGateway == nil {
		return ProviderGatewaySnapshot{
			GeneratedAt: time.Now().UTC(),
			Providers:   buildGatewayProviderViews(catalog, nil),
			RecentRuns:  []providergateway.RunRecord{},
		}, nil
	}

	recentRuns, err := r.ProviderGateway.ListRecentRuns(ctx, providerGatewayRecentRunsLimit)
	if err != nil {
		return ProviderGatewaySnapshot{}, err
	}
	stats, err := r.ProviderGateway.ListProviderStats(ctx)
	if err != nil {
		return ProviderGatewaySnapshot{}, err
	}
	return ProviderGatewaySnapshot{
		GeneratedAt: time.Now().UTC(),
		Providers:   buildGatewayProviderViews(catalog, stats),
		RecentRuns:  recentRuns,
	}, nil
}

func buildGatewayProviderViews(
	catalog agent.ProviderCatalog,
	stats []providergateway.ProviderStats,
) []ProviderGatewayProviderView {
	statsByProviderID := make(map[string]providergateway.ProviderStats, len(stats))
	for _, providerStats := range stats {
		statsByProviderID[strings.TrimSpace(providerStats.ProviderID)] = providerStats
	}

	views := make([]ProviderGatewayProviderView, 0, len(catalog.Providers)+len(stats))
	seenProviderIDs := make(map[string]struct{}, len(catalog.Providers))

	for _, provider := range catalog.Providers {
		seenProviderIDs[provider.ID] = struct{}{}
		view := ProviderGatewayProviderView{
			ProviderID:   provider.ID,
			ProviderKind: string(provider.Kind),
			DisplayName:  strings.TrimSpace(provider.DisplayName),
			Enabled:      provider.Enabled,
			Active:       provider.Active,
		}
		if providerStats, ok := statsByProviderID[provider.ID]; ok {
			applyProviderGatewayStats(&view, providerStats)
			if view.DisplayName == "" {
				view.DisplayName = providerStats.ProviderDisplayName
			}
		}
		if view.DisplayName == "" {
			view.DisplayName = provider.ID
		}
		views = append(views, view)
	}

	for _, providerStats := range stats {
		if _, ok := seenProviderIDs[providerStats.ProviderID]; ok {
			continue
		}
		view := ProviderGatewayProviderView{
			ProviderID:   providerStats.ProviderID,
			ProviderKind: providerStats.ProviderKind,
			DisplayName:  providerStats.ProviderDisplayName,
		}
		applyProviderGatewayStats(&view, providerStats)
		if view.DisplayName == "" {
			view.DisplayName = providerStats.ProviderID
		}
		views = append(views, view)
	}

	return views
}

func applyProviderGatewayStats(view *ProviderGatewayProviderView, stats providergateway.ProviderStats) {
	view.TotalRuns = stats.TotalRuns
	view.SucceededRuns = stats.SucceededRuns
	view.FailedRuns = stats.FailedRuns
	view.CancelledRuns = stats.CancelledRuns
	view.AverageDurationMS = stats.AverageDurationMS
	view.LastDurationMS = stats.LastDurationMS
	view.LastStatus = stats.LastStatus
	view.LastErrorCode = stats.LastErrorCode
	view.LastErrorMessage = stats.LastErrorMessage
	view.LastStartedAt = stats.LastStartedAt
	view.LastCompletedAt = stats.LastCompletedAt
}

func (r *Runtime) recordConversationProviderRun(
	ctx context.Context,
	binding resolvedConversationProvider,
	requestMode string,
	startedAt time.Time,
	result conversation.SubmitResult,
	callErr error,
) {
	if r.ProviderGateway == nil || binding.Record == nil {
		return
	}

	status, errorCode, errorMessage := classifyProviderRunOutcome(result, callErr)
	_, _ = r.ProviderGateway.RecordRun(ctx, providergateway.RunRecord{
		ProviderID:          binding.Record.ID,
		ProviderKind:        string(binding.Record.Kind),
		ProviderDisplayName: binding.Record.DisplayName,
		RequestMode:         requestMode,
		Model:               strings.TrimSpace(binding.Model),
		ConversationID:      strings.TrimSpace(result.Snapshot.ID),
		Status:              status,
		ErrorCode:           errorCode,
		ErrorMessage:        errorMessage,
		DurationMS:          time.Since(startedAt).Milliseconds(),
		StartedAt:           startedAt.UTC(),
		CompletedAt:         time.Now().UTC(),
	})
}

func classifyProviderRunOutcome(result conversation.SubmitResult, callErr error) (string, string, string) {
	if callErr != nil {
		if errors.Is(callErr, conversation.ErrConversationStreamCancelled) || errors.Is(callErr, context.Canceled) {
			return providergateway.RunStatusCancelled, "stream_cancelled", conversation.ErrConversationStreamCancelled.Error()
		}
		return providergateway.RunStatusFailed, providerRunErrorCodeGeneric, strings.TrimSpace(callErr.Error())
	}

	providerError := strings.TrimSpace(result.ProviderError)
	if providerError == "" {
		return providergateway.RunStatusSucceeded, "", ""
	}
	if providerError == conversation.ErrConversationStreamCancelled.Error() {
		return providergateway.RunStatusCancelled, "stream_cancelled", providerError
	}
	return providergateway.RunStatusFailed, providerRunErrorCodeGeneric, providerError
}
