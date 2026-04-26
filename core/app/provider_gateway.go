package app

import (
	"context"
	"errors"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/Mesteriis/rune-terminal/core/agent"
	"github.com/Mesteriis/rune-terminal/core/conversation"
	"github.com/Mesteriis/rune-terminal/core/providergateway"
)

const (
	providerGatewayRecentRunsLimit       = 20
	providerRunErrorCodeGeneric          = "provider_error"
	providerRunErrorCodeMissingBinary    = "missing_binary"
	providerRunErrorCodeAuthRequired     = "auth_required"
	providerRunErrorCodeUnreachable      = "unreachable"
	providerRunErrorCodeModelUnavailable = "model_unavailable"
	providerRunErrorCodeInvalidConfig    = "invalid_config"
	providerRunErrorCodeTimeout          = "timeout"
	providerRunErrorCodeUpstreamRejected = "upstream_rejected"
)

var openAICompatibleStatusCodePattern = regexp.MustCompile(`openai-compatible request failed \((\d{3})\)`)

type ProviderGatewayProviderView struct {
	ProviderID                    string     `json:"provider_id"`
	ProviderKind                  string     `json:"provider_kind"`
	DisplayName                   string     `json:"display_name"`
	Enabled                       bool       `json:"enabled"`
	Active                        bool       `json:"active"`
	RouteReady                    bool       `json:"route_ready"`
	RouteStatusState              string     `json:"route_status_state"`
	RouteStatusMessage            string     `json:"route_status_message,omitempty"`
	ResolvedBinary                string     `json:"resolved_binary,omitempty"`
	BaseURL                       string     `json:"base_url,omitempty"`
	Model                         string     `json:"model,omitempty"`
	RouteCheckedAt                *time.Time `json:"route_checked_at,omitempty"`
	RouteLatencyMS                int64      `json:"route_latency_ms"`
	RoutePrepared                 bool       `json:"route_prepared"`
	RoutePrepareState             string     `json:"route_prepare_state,omitempty"`
	RoutePrepareMessage           string     `json:"route_prepare_message,omitempty"`
	RoutePreparedAt               *time.Time `json:"route_prepared_at,omitempty"`
	RoutePrepareLatencyMS         int64      `json:"route_prepare_latency_ms"`
	TotalRuns                     int        `json:"total_runs"`
	SucceededRuns                 int        `json:"succeeded_runs"`
	FailedRuns                    int        `json:"failed_runs"`
	CancelledRuns                 int        `json:"cancelled_runs"`
	AverageDurationMS             int64      `json:"average_duration_ms"`
	AverageFirstResponseLatencyMS int64      `json:"average_first_response_latency_ms"`
	LastDurationMS                int64      `json:"last_duration_ms"`
	LastFirstResponseLatencyMS    int64      `json:"last_first_response_latency_ms"`
	LastStatus                    string     `json:"last_status,omitempty"`
	LastErrorCode                 string     `json:"last_error_code,omitempty"`
	LastErrorMessage              string     `json:"last_error_message,omitempty"`
	LastStartedAt                 *time.Time `json:"last_started_at,omitempty"`
	LastCompletedAt               *time.Time `json:"last_completed_at,omitempty"`
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
			Providers:   buildGatewayProviderViews(catalog, nil, nil),
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
	probes, err := r.ProviderGateway.ListLatestProbes(ctx)
	if err != nil {
		return ProviderGatewaySnapshot{}, err
	}
	return ProviderGatewaySnapshot{
		GeneratedAt: time.Now().UTC(),
		Providers:   buildGatewayProviderViews(catalog, stats, probes),
		RecentRuns:  recentRuns,
	}, nil
}

func buildGatewayProviderViews(
	catalog agent.ProviderCatalog,
	stats []providergateway.ProviderStats,
	probes []providergateway.ProbeRecord,
) []ProviderGatewayProviderView {
	statsByProviderID := make(map[string]providergateway.ProviderStats, len(stats))
	for _, providerStats := range stats {
		statsByProviderID[strings.TrimSpace(providerStats.ProviderID)] = providerStats
	}
	probesByProviderID := make(map[string]providergateway.ProbeRecord, len(probes))
	for _, probe := range probes {
		probesByProviderID[strings.TrimSpace(probe.ProviderID)] = probe
	}

	views := make([]ProviderGatewayProviderView, 0, len(catalog.Providers)+len(stats))
	seenProviderIDs := make(map[string]struct{}, len(catalog.Providers))

	for _, provider := range catalog.Providers {
		seenProviderIDs[provider.ID] = struct{}{}
		view := ProviderGatewayProviderView{
			ProviderID:       provider.ID,
			ProviderKind:     string(provider.Kind),
			DisplayName:      strings.TrimSpace(provider.DisplayName),
			Enabled:          provider.Enabled,
			Active:           provider.Active,
			Model:            providerConfigModel(provider),
			BaseURL:          providerConfigBaseURL(provider),
			RouteStatusState: providerProbeStatusUnchecked,
		}
		if providerStats, ok := statsByProviderID[provider.ID]; ok {
			applyProviderGatewayStats(&view, providerStats)
			if view.DisplayName == "" {
				view.DisplayName = providerStats.ProviderDisplayName
			}
		}
		if probe, ok := probesByProviderID[provider.ID]; ok {
			applyProviderGatewayProbe(&view, probe)
			if view.DisplayName == "" {
				view.DisplayName = probe.DisplayName
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
			ProviderID:       providerStats.ProviderID,
			ProviderKind:     providerStats.ProviderKind,
			DisplayName:      providerStats.ProviderDisplayName,
			RouteStatusState: providerProbeStatusUnchecked,
		}
		applyProviderGatewayStats(&view, providerStats)
		if probe, ok := probesByProviderID[providerStats.ProviderID]; ok {
			applyProviderGatewayProbe(&view, probe)
		}
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
	view.AverageFirstResponseLatencyMS = stats.AverageFirstResponseLatencyMS
	view.LastDurationMS = stats.LastDurationMS
	view.LastFirstResponseLatencyMS = stats.LastFirstResponseLatencyMS
	view.LastStatus = stats.LastStatus
	view.LastErrorCode = stats.LastErrorCode
	view.LastErrorMessage = stats.LastErrorMessage
	view.LastStartedAt = stats.LastStartedAt
	view.LastCompletedAt = stats.LastCompletedAt
}

func applyProviderGatewayProbe(view *ProviderGatewayProviderView, probe providergateway.ProbeRecord) {
	view.RouteReady = probe.Ready
	view.RouteStatusState = probe.StatusState
	view.RouteStatusMessage = probe.StatusMessage
	view.ResolvedBinary = probe.ResolvedBinary
	if strings.TrimSpace(probe.BaseURL) != "" {
		view.BaseURL = probe.BaseURL
	}
	if strings.TrimSpace(probe.Model) != "" {
		view.Model = probe.Model
	}
	view.RouteLatencyMS = probe.ProbeLatencyMS
	checkedAt := probe.CheckedAt.UTC()
	view.RouteCheckedAt = &checkedAt
	view.RoutePrepared = probe.Prepared
	view.RoutePrepareState = probe.PrepareState
	view.RoutePrepareMessage = probe.PrepareMessage
	view.RoutePrepareLatencyMS = probe.PrepareLatencyMS
	if probe.PreparedAt != nil {
		preparedAt := probe.PreparedAt.UTC()
		view.RoutePreparedAt = &preparedAt
	}
}

func providerConfigModel(provider agent.ProviderView) string {
	switch provider.Kind {
	case agent.ProviderKindCodex:
		if provider.Codex != nil {
			return strings.TrimSpace(provider.Codex.Model)
		}
	case agent.ProviderKindClaude:
		if provider.Claude != nil {
			return strings.TrimSpace(provider.Claude.Model)
		}
	case agent.ProviderKindOpenAICompatible:
		if provider.OpenAICompatible != nil {
			return strings.TrimSpace(provider.OpenAICompatible.Model)
		}
	}
	return ""
}

func providerConfigBaseURL(provider agent.ProviderView) string {
	if provider.Kind == agent.ProviderKindOpenAICompatible && provider.OpenAICompatible != nil {
		return strings.TrimSpace(provider.OpenAICompatible.BaseURL)
	}
	return ""
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

	status, errorCode, errorMessage := classifyProviderRunOutcome(binding, result, callErr)
	_, _ = r.ProviderGateway.RecordRun(ctx, providergateway.RunRecord{
		ProviderID:             binding.Record.ID,
		ProviderKind:           string(binding.Record.Kind),
		ProviderDisplayName:    binding.Record.DisplayName,
		RequestMode:            requestMode,
		Model:                  strings.TrimSpace(binding.Model),
		ConversationID:         strings.TrimSpace(result.Snapshot.ID),
		Status:                 status,
		ErrorCode:              errorCode,
		ErrorMessage:           errorMessage,
		DurationMS:             time.Since(startedAt).Milliseconds(),
		FirstResponseLatencyMS: result.FirstResponseLatencyMS,
		StartedAt:              startedAt.UTC(),
		CompletedAt:            time.Now().UTC(),
	})
}

func classifyProviderRunOutcome(
	binding resolvedConversationProvider,
	result conversation.SubmitResult,
	callErr error,
) (string, string, string) {
	if callErr != nil {
		if errors.Is(callErr, conversation.ErrConversationStreamCancelled) || errors.Is(callErr, context.Canceled) {
			return providergateway.RunStatusCancelled, "stream_cancelled", conversation.ErrConversationStreamCancelled.Error()
		}
		errorMessage := strings.TrimSpace(callErr.Error())
		return providergateway.RunStatusFailed, classifyProviderRunErrorCode(binding, errorMessage, callErr), errorMessage
	}

	providerError := strings.TrimSpace(result.ProviderError)
	if providerError == "" {
		return providergateway.RunStatusSucceeded, "", ""
	}
	if providerError == conversation.ErrConversationStreamCancelled.Error() {
		return providergateway.RunStatusCancelled, "stream_cancelled", providerError
	}
	return providergateway.RunStatusFailed, classifyProviderRunErrorCode(binding, providerError, nil), providerError
}

func classifyProviderRunErrorCode(
	binding resolvedConversationProvider,
	errorMessage string,
	callErr error,
) string {
	normalizedMessage := strings.ToLower(strings.TrimSpace(errorMessage))

	switch {
	case errors.Is(callErr, context.DeadlineExceeded), strings.Contains(normalizedMessage, "deadline exceeded"), strings.Contains(normalizedMessage, "timeout"):
		return providerRunErrorCodeTimeout
	case strings.Contains(normalizedMessage, "command is required"),
		strings.Contains(normalizedMessage, "command is not available on path"),
		strings.Contains(normalizedMessage, "executable file not found"):
		return providerRunErrorCodeMissingBinary
	case strings.Contains(normalizedMessage, "not logged in"),
		strings.Contains(normalizedMessage, "login required"),
		strings.Contains(normalizedMessage, "authentication required"):
		return providerRunErrorCodeAuthRequired
	case strings.Contains(normalizedMessage, "base_url is required"),
		strings.Contains(normalizedMessage, "model is required"),
		strings.Contains(normalizedMessage, "settings are required"),
		strings.Contains(normalizedMessage, "invalid config"):
		return providerRunErrorCodeInvalidConfig
	case strings.Contains(normalizedMessage, "configured model"),
		strings.Contains(normalizedMessage, "model unavailable"),
		strings.Contains(normalizedMessage, "model not found"),
		strings.Contains(normalizedMessage, "does not exist"):
		return providerRunErrorCodeModelUnavailable
	case strings.Contains(normalizedMessage, "connection refused"),
		strings.Contains(normalizedMessage, "no such host"),
		strings.Contains(normalizedMessage, "network is unreachable"),
		strings.Contains(normalizedMessage, "dial tcp"),
		strings.Contains(normalizedMessage, "connection reset by peer"):
		return providerRunErrorCodeUnreachable
	}

	if statusCode, ok := parseOpenAICompatibleFailureStatusCode(normalizedMessage); ok {
		switch statusCode {
		case http.StatusNotFound:
			if binding.Record != nil && binding.Record.Kind == agent.ProviderKindOpenAICompatible {
				return providerRunErrorCodeModelUnavailable
			}
		case http.StatusBadRequest, http.StatusUnauthorized, http.StatusForbidden, http.StatusTooManyRequests:
			return providerRunErrorCodeUpstreamRejected
		}
		if statusCode >= 400 {
			return providerRunErrorCodeUpstreamRejected
		}
	}

	return providerRunErrorCodeGeneric
}

func parseOpenAICompatibleFailureStatusCode(errorMessage string) (int, bool) {
	matches := openAICompatibleStatusCodePattern.FindStringSubmatch(errorMessage)
	if len(matches) != 2 {
		return 0, false
	}
	switch matches[1] {
	case "400":
		return http.StatusBadRequest, true
	case "401":
		return http.StatusUnauthorized, true
	case "403":
		return http.StatusForbidden, true
	case "404":
		return http.StatusNotFound, true
	case "429":
		return http.StatusTooManyRequests, true
	case "500":
		return http.StatusInternalServerError, true
	case "502":
		return http.StatusBadGateway, true
	case "503":
		return http.StatusServiceUnavailable, true
	case "504":
		return http.StatusGatewayTimeout, true
	default:
		return 0, false
	}
}
