package app

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/Mesteriis/rune-terminal/core/agent"
	"github.com/Mesteriis/rune-terminal/core/conversation"
	"github.com/Mesteriis/rune-terminal/core/providergateway"
)

const (
	providerProbeStatusReady            = "ready"
	providerProbeStatusDisabled         = "disabled"
	providerProbeStatusMissing          = "missing"
	providerProbeStatusAuthRequired     = "auth-required"
	providerProbeStatusUnreachable      = "unreachable"
	providerProbeStatusModelUnavailable = "model-unavailable"
	providerProbeStatusUnchecked        = "unchecked"
	providerPrepareStatePrepared        = "prepared"
)

type ProviderProbeResult struct {
	ProviderID       string    `json:"provider_id"`
	ProviderKind     string    `json:"provider_kind"`
	DisplayName      string    `json:"display_name"`
	Ready            bool      `json:"ready"`
	StatusState      string    `json:"status_state"`
	StatusMessage    string    `json:"status_message"`
	ResolvedBinary   string    `json:"resolved_binary,omitempty"`
	BaseURL          string    `json:"base_url,omitempty"`
	Model            string    `json:"model,omitempty"`
	DiscoveredModels []string  `json:"discovered_models,omitempty"`
	LatencyMS        int64     `json:"latency_ms"`
	CheckedAt        time.Time `json:"checked_at"`
}

type ProviderPrepareResult struct {
	ProviderID         string    `json:"provider_id"`
	ProviderKind       string    `json:"provider_kind"`
	DisplayName        string    `json:"display_name"`
	Prepared           bool      `json:"prepared"`
	PrepareState       string    `json:"prepare_state"`
	PrepareMessage     string    `json:"prepare_message"`
	ResolvedBinary     string    `json:"resolved_binary,omitempty"`
	BaseURL            string    `json:"base_url,omitempty"`
	Model              string    `json:"model,omitempty"`
	LatencyMS          int64     `json:"latency_ms"`
	PreparedAt         time.Time `json:"prepared_at"`
	RouteReady         bool      `json:"route_ready"`
	RouteStatusState   string    `json:"route_status_state"`
	RouteStatusMessage string    `json:"route_status_message"`
}

func (r *Runtime) ProbeProvider(ctx context.Context, providerID string) (ProviderProbeResult, error) {
	record, err := r.Agent.Provider(strings.TrimSpace(providerID))
	if err != nil {
		return ProviderProbeResult{}, err
	}

	startedAt := time.Now().UTC()
	baseResult := ProviderProbeResult{
		ProviderID:   record.ID,
		ProviderKind: string(record.Kind),
		DisplayName:  strings.TrimSpace(record.DisplayName),
		Model:        providerRecordModel(record),
		CheckedAt:    startedAt,
	}
	if !record.Enabled {
		baseResult.Ready = false
		baseResult.StatusState = providerProbeStatusDisabled
		baseResult.StatusMessage = "Provider is disabled."
		baseResult.LatencyMS = time.Since(startedAt).Milliseconds()
		return baseResult, nil
	}

	switch record.Kind {
	case agent.ProviderKindCodex, agent.ProviderKindClaude:
		result, err := r.probeCLIProvider(record, startedAt)
		if err != nil {
			return ProviderProbeResult{}, err
		}
		r.recordProviderProbe(ctx, result)
		return result, nil
	case agent.ProviderKindOpenAICompatible:
		result, err := r.probeOpenAICompatibleProvider(ctx, record, startedAt)
		if err != nil {
			return ProviderProbeResult{}, err
		}
		r.recordProviderProbe(ctx, result)
		return result, nil
	default:
		return ProviderProbeResult{}, fmt.Errorf("%w: %s", agent.ErrProviderKindUnsupported, record.Kind)
	}
}

func (r *Runtime) PrewarmProvider(ctx context.Context, providerID string) (ProviderPrepareResult, error) {
	record, err := r.Agent.Provider(strings.TrimSpace(providerID))
	if err != nil {
		return ProviderPrepareResult{}, err
	}

	startedAt := time.Now().UTC()
	baseResult := ProviderPrepareResult{
		ProviderID:   record.ID,
		ProviderKind: string(record.Kind),
		DisplayName:  strings.TrimSpace(record.DisplayName),
		Model:        providerRecordModel(record),
		PreparedAt:   startedAt,
	}
	if !record.Enabled {
		baseResult.Prepared = false
		baseResult.PrepareState = providerProbeStatusDisabled
		baseResult.PrepareMessage = "Provider is disabled."
		baseResult.RouteReady = false
		baseResult.RouteStatusState = providerProbeStatusDisabled
		baseResult.RouteStatusMessage = "Provider is disabled."
		baseResult.LatencyMS = time.Since(startedAt).Milliseconds()
		r.recordProviderPrepare(ctx, baseResult)
		return baseResult, nil
	}

	var probeResult ProviderProbeResult
	switch record.Kind {
	case agent.ProviderKindCodex, agent.ProviderKindClaude:
		probeResult, err = r.probeCLIProvider(record, startedAt)
	case agent.ProviderKindOpenAICompatible:
		probeResult, err = r.probeOpenAICompatibleProvider(ctx, record, startedAt)
	default:
		return ProviderPrepareResult{}, fmt.Errorf("%w: %s", agent.ErrProviderKindUnsupported, record.Kind)
	}
	if err != nil {
		return ProviderPrepareResult{}, err
	}

	result := ProviderPrepareResult{
		ProviderID:         probeResult.ProviderID,
		ProviderKind:       probeResult.ProviderKind,
		DisplayName:        probeResult.DisplayName,
		ResolvedBinary:     probeResult.ResolvedBinary,
		BaseURL:            probeResult.BaseURL,
		Model:              probeResult.Model,
		LatencyMS:          probeResult.LatencyMS,
		PreparedAt:         time.Now().UTC(),
		RouteReady:         probeResult.Ready,
		RouteStatusState:   probeResult.StatusState,
		RouteStatusMessage: probeResult.StatusMessage,
	}
	if probeResult.Ready {
		result.Prepared = true
		result.PrepareState = providerPrepareStatePrepared
		if record.Kind == agent.ProviderKindOpenAICompatible {
			result.PrepareMessage = fmt.Sprintf(
				"Route prepared via model discovery with %d available model(s).",
				len(probeResult.DiscoveredModels),
			)
		} else {
			result.PrepareMessage = fmt.Sprintf(
				"%s route verified and ready for on-demand launch.",
				firstNonEmptyProviderLabel(strings.TrimSpace(record.DisplayName), string(record.Kind)),
			)
		}
	} else {
		result.Prepared = false
		result.PrepareState = probeResult.StatusState
		result.PrepareMessage = probeResult.StatusMessage
	}
	r.recordProviderProbe(ctx, probeResult)
	r.recordProviderPrepare(ctx, result)
	return result, nil
}

func (r *Runtime) probeCLIProvider(record agent.ProviderRecord, startedAt time.Time) (ProviderProbeResult, error) {
	result := ProviderProbeResult{
		ProviderID:   record.ID,
		ProviderKind: string(record.Kind),
		DisplayName:  strings.TrimSpace(record.DisplayName),
		Model:        providerRecordModel(record),
		CheckedAt:    startedAt,
	}
	cliProbe, err := agent.ProbeCLIProvider(record)
	if err != nil {
		return ProviderProbeResult{}, err
	}
	result.StatusState = strings.TrimSpace(cliProbe.StatusState)
	result.StatusMessage = strings.TrimSpace(cliProbe.StatusMessage)
	result.ResolvedBinary = strings.TrimSpace(cliProbe.ResolvedBinary)
	if result.StatusState == "" {
		result.StatusState = providerProbeStatusMissing
	}
	result.Ready = result.StatusState == providerProbeStatusReady
	result.LatencyMS = time.Since(startedAt).Milliseconds()
	return result, nil
}

func (r *Runtime) probeOpenAICompatibleProvider(
	ctx context.Context,
	record agent.ProviderRecord,
	startedAt time.Time,
) (ProviderProbeResult, error) {
	result := ProviderProbeResult{
		ProviderID:   record.ID,
		ProviderKind: string(record.Kind),
		DisplayName:  strings.TrimSpace(record.DisplayName),
		Model:        providerRecordModel(record),
		CheckedAt:    startedAt,
	}
	if record.OpenAICompatible == nil {
		return ProviderProbeResult{}, fmt.Errorf("%w: openai-compatible config is required", agent.ErrProviderInvalidConfig)
	}
	result.BaseURL = strings.TrimSpace(record.OpenAICompatible.BaseURL)

	models, err := conversation.DiscoverOpenAICompatibleModels(ctx, record.OpenAICompatible.BaseURL)
	result.LatencyMS = time.Since(startedAt).Milliseconds()
	if err != nil {
		result.Ready = false
		result.StatusState = providerProbeStatusUnreachable
		result.StatusMessage = strings.TrimSpace(err.Error())
		return result, nil
	}
	result.DiscoveredModels = models
	if result.Model != "" && !containsTrimmedString(models, result.Model) {
		result.Ready = false
		result.StatusState = providerProbeStatusModelUnavailable
		result.StatusMessage = fmt.Sprintf("Configured model %q is not available from the source.", result.Model)
		return result, nil
	}
	result.Ready = true
	result.StatusState = providerProbeStatusReady
	if len(models) == 0 {
		result.StatusMessage = "Source responded without any discoverable chat models."
		result.Ready = false
		result.StatusState = providerProbeStatusModelUnavailable
		return result, nil
	}
	result.StatusMessage = fmt.Sprintf("Source is reachable with %d discovered model(s).", len(models))
	return result, nil
}

func (r *Runtime) recordProviderProbe(ctx context.Context, result ProviderProbeResult) {
	if r.ProviderGateway == nil {
		return
	}
	_, _ = r.ProviderGateway.RecordProbe(ctx, providergateway.ProbeRecord{
		ProviderID:     strings.TrimSpace(result.ProviderID),
		ProviderKind:   strings.TrimSpace(result.ProviderKind),
		DisplayName:    strings.TrimSpace(result.DisplayName),
		Ready:          result.Ready,
		StatusState:    strings.TrimSpace(result.StatusState),
		StatusMessage:  strings.TrimSpace(result.StatusMessage),
		ResolvedBinary: strings.TrimSpace(result.ResolvedBinary),
		BaseURL:        strings.TrimSpace(result.BaseURL),
		Model:          strings.TrimSpace(result.Model),
		ProbeLatencyMS: result.LatencyMS,
		CheckedAt:      result.CheckedAt.UTC(),
	})
}

func (r *Runtime) recordProviderPrepare(ctx context.Context, result ProviderPrepareResult) {
	if r.ProviderGateway == nil {
		return
	}
	preparedAt := result.PreparedAt.UTC()
	_, _ = r.ProviderGateway.RecordPrepare(ctx, providergateway.ProbeRecord{
		ProviderID:       strings.TrimSpace(result.ProviderID),
		ProviderKind:     strings.TrimSpace(result.ProviderKind),
		DisplayName:      strings.TrimSpace(result.DisplayName),
		ResolvedBinary:   strings.TrimSpace(result.ResolvedBinary),
		BaseURL:          strings.TrimSpace(result.BaseURL),
		Model:            strings.TrimSpace(result.Model),
		Prepared:         result.Prepared,
		PrepareState:     strings.TrimSpace(result.PrepareState),
		PrepareMessage:   strings.TrimSpace(result.PrepareMessage),
		PrepareLatencyMS: result.LatencyMS,
		CheckedAt:        preparedAt,
		PreparedAt:       &preparedAt,
	})
}

func providerRecordModel(record agent.ProviderRecord) string {
	switch record.Kind {
	case agent.ProviderKindCodex:
		if record.Codex != nil {
			return strings.TrimSpace(record.Codex.Model)
		}
	case agent.ProviderKindClaude:
		if record.Claude != nil {
			return strings.TrimSpace(record.Claude.Model)
		}
	case agent.ProviderKindOpenAICompatible:
		if record.OpenAICompatible != nil {
			return strings.TrimSpace(record.OpenAICompatible.Model)
		}
	}
	return ""
}

func containsTrimmedString(items []string, needle string) bool {
	needle = strings.TrimSpace(needle)
	if needle == "" {
		return false
	}
	for _, item := range items {
		if strings.TrimSpace(item) == needle {
			return true
		}
	}
	return false
}

func firstNonEmptyProviderLabel(displayName string, fallback string) string {
	if strings.TrimSpace(displayName) != "" {
		return strings.TrimSpace(displayName)
	}
	switch strings.TrimSpace(fallback) {
	case "codex":
		return "Codex CLI"
	case "claude":
		return "Claude Code CLI"
	case "openai-compatible":
		return "OpenAI-compatible route"
	default:
		return strings.TrimSpace(fallback)
	}
}
