package providergateway

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/Mesteriis/rune-terminal/internal/ids"
)

const (
	RunModeSync   = "sync"
	RunModeStream = "stream"

	RunStatusSucceeded = "succeeded"
	RunStatusFailed    = "failed"
	RunStatusCancelled = "cancelled"

	defaultRecentRunsLimit = 20
	maxRecentRunsLimit     = 100
)

type RunRecord struct {
	ID                     string    `json:"id"`
	ProviderID             string    `json:"provider_id"`
	ProviderKind           string    `json:"provider_kind"`
	ProviderDisplayName    string    `json:"provider_display_name"`
	ActorUsername          string    `json:"actor_username,omitempty"`
	ActorHomeDir           string    `json:"actor_home_dir,omitempty"`
	RequestMode            string    `json:"request_mode"`
	Model                  string    `json:"model,omitempty"`
	ConversationID         string    `json:"conversation_id,omitempty"`
	Status                 string    `json:"status"`
	ErrorCode              string    `json:"error_code,omitempty"`
	ErrorMessage           string    `json:"error_message,omitempty"`
	RouteReady             bool      `json:"route_ready"`
	RouteStatusState       string    `json:"route_status_state,omitempty"`
	RouteStatusMessage     string    `json:"route_status_message,omitempty"`
	RoutePrepared          bool      `json:"route_prepared"`
	RoutePrepareState      string    `json:"route_prepare_state,omitempty"`
	RoutePrepareMessage    string    `json:"route_prepare_message,omitempty"`
	ResolvedBinary         string    `json:"resolved_binary,omitempty"`
	BaseURL                string    `json:"base_url,omitempty"`
	DurationMS             int64     `json:"duration_ms"`
	FirstResponseLatencyMS int64     `json:"first_response_latency_ms"`
	StartedAt              time.Time `json:"started_at"`
	CompletedAt            time.Time `json:"completed_at"`
}

type ProviderStats struct {
	ProviderID                    string     `json:"provider_id"`
	ProviderKind                  string     `json:"provider_kind"`
	ProviderDisplayName           string     `json:"provider_display_name"`
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

type ProbeRecord struct {
	ProviderID       string     `json:"provider_id"`
	ProviderKind     string     `json:"provider_kind"`
	DisplayName      string     `json:"display_name"`
	Ready            bool       `json:"ready"`
	StatusState      string     `json:"status_state"`
	StatusMessage    string     `json:"status_message"`
	ResolvedBinary   string     `json:"resolved_binary,omitempty"`
	BaseURL          string     `json:"base_url,omitempty"`
	Model            string     `json:"model,omitempty"`
	ProbeLatencyMS   int64      `json:"probe_latency_ms"`
	CheckedAt        time.Time  `json:"checked_at"`
	Prepared         bool       `json:"prepared"`
	PrepareState     string     `json:"prepare_state,omitempty"`
	PrepareMessage   string     `json:"prepare_message,omitempty"`
	PrepareLatencyMS int64      `json:"prepare_latency_ms"`
	PreparedAt       *time.Time `json:"prepared_at,omitempty"`
}

type Store struct {
	db *sql.DB
}

type RecentRunsFilter struct {
	ProviderID string
	Status     string
	Query      string
	Offset     int
	Limit      int
}

type RecentRunsPage struct {
	Items   []RunRecord
	Total   int
	Offset  int
	Limit   int
	HasMore bool
}

func NewStore(ctx context.Context, db *sql.DB) (*Store, error) {
	if db == nil {
		return nil, fmt.Errorf("provider gateway db is required")
	}
	return &Store{db: db}, nil
}

func (s *Store) RecordRun(ctx context.Context, run RunRecord) (RunRecord, error) {
	normalized := normalizeRunRecord(run)
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO provider_gateway_runs (
			id,
			provider_id,
			provider_kind,
			provider_display_name,
			actor_username,
			actor_home_dir,
			request_mode,
			model,
			conversation_id,
			status,
			error_code,
			error_message,
			route_ready,
			route_status_state,
			route_status_message,
			route_prepared,
			route_prepare_state,
			route_prepare_message,
			resolved_binary,
			base_url,
			duration_ms,
			first_response_latency_ms,
			started_at,
			completed_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		normalized.ID,
		normalized.ProviderID,
		normalized.ProviderKind,
		normalized.ProviderDisplayName,
		normalized.ActorUsername,
		normalized.ActorHomeDir,
		normalized.RequestMode,
		normalized.Model,
		normalized.ConversationID,
		normalized.Status,
		normalized.ErrorCode,
		normalized.ErrorMessage,
		normalized.RouteReady,
		normalized.RouteStatusState,
		normalized.RouteStatusMessage,
		normalized.RoutePrepared,
		normalized.RoutePrepareState,
		normalized.RoutePrepareMessage,
		normalized.ResolvedBinary,
		normalized.BaseURL,
		normalized.DurationMS,
		normalized.FirstResponseLatencyMS,
		normalized.StartedAt.Format(time.RFC3339Nano),
		normalized.CompletedAt.Format(time.RFC3339Nano),
	)
	if err != nil {
		return RunRecord{}, fmt.Errorf("record provider gateway run: %w", err)
	}
	return normalized, nil
}

func (s *Store) ListRecentRuns(ctx context.Context, limit int) ([]RunRecord, error) {
	return s.ListRecentRunsFiltered(ctx, RecentRunsFilter{Limit: limit})
}

func (s *Store) ListRecentRunsPage(ctx context.Context, filter RecentRunsFilter) (RecentRunsPage, error) {
	normalizedLimit := normalizeRecentRunsLimit(filter.Limit)
	normalizedOffset := normalizeRecentRunsOffset(filter.Offset)
	normalizedStatus := normalizeRunStatusFilter(filter.Status)
	normalizedProviderID := strings.TrimSpace(filter.ProviderID)
	normalizedQuery := strings.ToLower(strings.TrimSpace(filter.Query))

	whereSQL, args := buildRecentRunsFilter(normalizedProviderID, normalizedStatus, normalizedQuery)

	countQuery := "SELECT COUNT(*) FROM provider_gateway_runs"
	if whereSQL != "" {
		countQuery += " WHERE " + whereSQL
	}
	var total int
	if err := s.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return RecentRunsPage{}, fmt.Errorf("count provider gateway runs: %w", err)
	}

	items, err := s.listRecentRunsWindow(ctx, whereSQL, args, normalizedOffset, normalizedLimit)
	if err != nil {
		return RecentRunsPage{}, err
	}
	return RecentRunsPage{
		Items:   items,
		Total:   total,
		Offset:  normalizedOffset,
		Limit:   normalizedLimit,
		HasMore: normalizedOffset+len(items) < total,
	}, nil
}

func (s *Store) ListRecentRunsFiltered(ctx context.Context, filter RecentRunsFilter) ([]RunRecord, error) {
	page, err := s.ListRecentRunsPage(ctx, filter)
	if err != nil {
		return nil, err
	}
	return page.Items, nil
}

func (s *Store) listRecentRunsWindow(
	ctx context.Context,
	whereSQL string,
	args []any,
	offset int,
	limit int,
) ([]RunRecord, error) {
	query := strings.Builder{}
	query.WriteString(`
		SELECT
			id,
			provider_id,
			provider_kind,
			provider_display_name,
			actor_username,
			actor_home_dir,
			request_mode,
			model,
			conversation_id,
			status,
			error_code,
			error_message,
			route_ready,
			route_status_state,
			route_status_message,
			route_prepared,
			route_prepare_state,
			route_prepare_message,
			resolved_binary,
			base_url,
			duration_ms,
			first_response_latency_ms,
			started_at,
			completed_at
		FROM provider_gateway_runs
	`)

	if whereSQL != "" {
		query.WriteString(" WHERE ")
		query.WriteString(whereSQL)
	}
	query.WriteString(`
		ORDER BY started_at DESC, id DESC
		LIMIT ? OFFSET ?
	`)
	queryArgs := append(append([]any(nil), args...), limit, offset)

	rows, err := s.db.QueryContext(ctx, query.String(), queryArgs...)
	if err != nil {
		return nil, fmt.Errorf("list provider gateway runs: %w", err)
	}
	defer rows.Close()

	runs := make([]RunRecord, 0, limit)
	for rows.Next() {
		run, err := scanRunRecord(rows)
		if err != nil {
			return nil, err
		}
		runs = append(runs, run)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate provider gateway runs: %w", err)
	}
	return runs, nil
}

func buildRecentRunsFilter(providerID string, status string, query string) (string, []any) {
	whereClauses := make([]string, 0, 3)
	args := make([]any, 0, 12)
	if providerID != "" {
		whereClauses = append(whereClauses, "provider_id = ?")
		args = append(args, providerID)
	}
	if status != "" {
		whereClauses = append(whereClauses, "status = ?")
		args = append(args, status)
	}
	if query != "" {
		whereClauses = append(whereClauses, `(
			LOWER(provider_id) LIKE ?
			OR LOWER(provider_display_name) LIKE ?
			OR LOWER(model) LIKE ?
			OR LOWER(conversation_id) LIKE ?
			OR LOWER(status) LIKE ?
			OR LOWER(error_code) LIKE ?
			OR LOWER(error_message) LIKE ?
			OR LOWER(request_mode) LIKE ?
			OR LOWER(actor_username) LIKE ?
			OR LOWER(route_status_state) LIKE ?
			OR LOWER(route_prepare_state) LIKE ?
			OR LOWER(base_url) LIKE ?
		)`)
		searchTerm := "%" + query + "%"
		for range 12 {
			args = append(args, searchTerm)
		}
	}
	return strings.Join(whereClauses, " AND "), args
}

func (s *Store) ListProviderStats(ctx context.Context) ([]ProviderStats, error) {
	rows, err := s.db.QueryContext(ctx, `
		WITH provider_rollups AS (
			SELECT
				provider_id,
				provider_kind,
				COUNT(*) AS total_runs,
				SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) AS succeeded_runs,
				SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_runs,
				SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_runs,
				CAST(AVG(duration_ms) AS INTEGER) AS average_duration_ms,
				CAST(AVG(first_response_latency_ms) AS INTEGER) AS average_first_response_latency_ms
			FROM provider_gateway_runs
			GROUP BY provider_id, provider_kind
		)
		SELECT
			rollup.provider_id,
			rollup.provider_kind,
			latest.provider_display_name,
			rollup.total_runs,
			rollup.succeeded_runs,
			rollup.failed_runs,
			rollup.cancelled_runs,
			COALESCE(rollup.average_duration_ms, 0) AS average_duration_ms,
			COALESCE(rollup.average_first_response_latency_ms, 0) AS average_first_response_latency_ms,
			latest.duration_ms,
			latest.first_response_latency_ms,
			latest.status,
			latest.error_code,
			latest.error_message,
			latest.started_at,
			latest.completed_at
		FROM provider_rollups AS rollup
		JOIN provider_gateway_runs AS latest
			ON latest.id = (
				SELECT id
				FROM provider_gateway_runs
				WHERE provider_id = rollup.provider_id
				ORDER BY started_at DESC, id DESC
				LIMIT 1
			)
		ORDER BY latest.started_at DESC, rollup.provider_id
	`)
	if err != nil {
		return nil, fmt.Errorf("list provider gateway stats: %w", err)
	}
	defer rows.Close()

	stats := make([]ProviderStats, 0)
	for rows.Next() {
		providerStat, err := scanProviderStats(rows)
		if err != nil {
			return nil, err
		}
		stats = append(stats, providerStat)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate provider gateway stats: %w", err)
	}
	return stats, nil
}

func (s *Store) RecordProbe(ctx context.Context, probe ProbeRecord) (ProbeRecord, error) {
	normalized := normalizeProbeRecord(probe)
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO provider_gateway_probes (
			provider_id,
			provider_kind,
			display_name,
			ready,
			status_state,
			status_message,
			resolved_binary,
			base_url,
			model,
			probe_latency_ms,
			checked_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(provider_id) DO UPDATE SET
			provider_kind = excluded.provider_kind,
			display_name = excluded.display_name,
			ready = excluded.ready,
			status_state = excluded.status_state,
			status_message = excluded.status_message,
			resolved_binary = excluded.resolved_binary,
			base_url = excluded.base_url,
			model = excluded.model,
			probe_latency_ms = excluded.probe_latency_ms,
			checked_at = excluded.checked_at
	`,
		normalized.ProviderID,
		normalized.ProviderKind,
		normalized.DisplayName,
		normalized.Ready,
		normalized.StatusState,
		normalized.StatusMessage,
		normalized.ResolvedBinary,
		normalized.BaseURL,
		normalized.Model,
		normalized.ProbeLatencyMS,
		normalized.CheckedAt.Format(time.RFC3339Nano),
	)
	if err != nil {
		return ProbeRecord{}, fmt.Errorf("record provider gateway probe: %w", err)
	}
	return normalized, nil
}

func (s *Store) RecordPrepare(ctx context.Context, probe ProbeRecord) (ProbeRecord, error) {
	normalized := normalizeProbeRecord(probe)
	preparedAt := ""
	if normalized.PreparedAt != nil && !normalized.PreparedAt.IsZero() {
		preparedAt = normalized.PreparedAt.UTC().Format(time.RFC3339Nano)
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO provider_gateway_probes (
			provider_id,
			provider_kind,
			display_name,
			ready,
			status_state,
			status_message,
			resolved_binary,
			base_url,
			model,
			probe_latency_ms,
			checked_at,
			prepared,
			prepare_state,
			prepare_message,
			prepare_latency_ms,
			prepared_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(provider_id) DO UPDATE SET
			provider_kind = excluded.provider_kind,
			display_name = excluded.display_name,
			resolved_binary = excluded.resolved_binary,
			base_url = excluded.base_url,
			model = excluded.model,
			prepared = excluded.prepared,
			prepare_state = excluded.prepare_state,
			prepare_message = excluded.prepare_message,
			prepare_latency_ms = excluded.prepare_latency_ms,
			prepared_at = excluded.prepared_at
	`,
		normalized.ProviderID,
		normalized.ProviderKind,
		normalized.DisplayName,
		normalized.Ready,
		normalized.StatusState,
		normalized.StatusMessage,
		normalized.ResolvedBinary,
		normalized.BaseURL,
		normalized.Model,
		normalized.ProbeLatencyMS,
		normalized.CheckedAt.Format(time.RFC3339Nano),
		normalized.Prepared,
		normalized.PrepareState,
		normalized.PrepareMessage,
		normalized.PrepareLatencyMS,
		preparedAt,
	)
	if err != nil {
		return ProbeRecord{}, fmt.Errorf("record provider gateway prepare: %w", err)
	}
	return normalized, nil
}

func (s *Store) ListLatestProbes(ctx context.Context) ([]ProbeRecord, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT
			provider_id,
			provider_kind,
			display_name,
			ready,
			status_state,
			status_message,
			resolved_binary,
			base_url,
			model,
			probe_latency_ms,
			checked_at,
			prepared,
			prepare_state,
			prepare_message,
			prepare_latency_ms,
			prepared_at
		FROM provider_gateway_probes
		ORDER BY checked_at DESC, provider_id
	`)
	if err != nil {
		return nil, fmt.Errorf("list provider gateway probes: %w", err)
	}
	defer rows.Close()

	probes := make([]ProbeRecord, 0)
	for rows.Next() {
		probe, err := scanProbeRecord(rows)
		if err != nil {
			return nil, err
		}
		probes = append(probes, probe)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate provider gateway probes: %w", err)
	}
	return probes, nil
}

func (s *Store) GetLatestProbe(ctx context.Context, providerID string) (ProbeRecord, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT
			provider_id,
			provider_kind,
			display_name,
			ready,
			status_state,
			status_message,
			resolved_binary,
			base_url,
			model,
			probe_latency_ms,
			checked_at,
			prepared,
			prepare_state,
			prepare_message,
			prepare_latency_ms,
			prepared_at
		FROM provider_gateway_probes
		WHERE provider_id = ?
	`, strings.TrimSpace(providerID))
	probe, err := scanProbeRecord(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ProbeRecord{}, sql.ErrNoRows
		}
		return ProbeRecord{}, err
	}
	return probe, nil
}

func (s *Store) ClearProbe(ctx context.Context, providerID string) error {
	if _, err := s.db.ExecContext(ctx, `DELETE FROM provider_gateway_probes WHERE provider_id = ?`, strings.TrimSpace(providerID)); err != nil {
		return fmt.Errorf("clear provider gateway probe: %w", err)
	}
	return nil
}

func normalizeRunRecord(run RunRecord) RunRecord {
	if strings.TrimSpace(run.ID) == "" {
		run.ID = ids.New("provider-run")
	}
	run.ProviderID = strings.TrimSpace(run.ProviderID)
	run.ProviderKind = strings.TrimSpace(run.ProviderKind)
	run.ProviderDisplayName = strings.TrimSpace(run.ProviderDisplayName)
	run.ActorUsername = strings.TrimSpace(run.ActorUsername)
	run.ActorHomeDir = strings.TrimSpace(run.ActorHomeDir)
	run.RequestMode = normalizeRequestMode(run.RequestMode)
	run.Model = strings.TrimSpace(run.Model)
	run.ConversationID = strings.TrimSpace(run.ConversationID)
	run.Status = normalizeRunStatus(run.Status)
	run.ErrorCode = strings.TrimSpace(run.ErrorCode)
	run.ErrorMessage = strings.TrimSpace(run.ErrorMessage)
	run.RouteStatusState = strings.TrimSpace(run.RouteStatusState)
	run.RouteStatusMessage = strings.TrimSpace(run.RouteStatusMessage)
	run.RoutePrepareState = strings.TrimSpace(run.RoutePrepareState)
	run.RoutePrepareMessage = strings.TrimSpace(run.RoutePrepareMessage)
	run.ResolvedBinary = strings.TrimSpace(run.ResolvedBinary)
	run.BaseURL = strings.TrimSpace(run.BaseURL)
	if run.DurationMS < 0 {
		run.DurationMS = 0
	}
	if run.FirstResponseLatencyMS < 0 {
		run.FirstResponseLatencyMS = 0
	}
	if run.StartedAt.IsZero() {
		run.StartedAt = time.Now().UTC()
	}
	if run.CompletedAt.IsZero() {
		run.CompletedAt = run.StartedAt
	}
	if run.CompletedAt.Before(run.StartedAt) {
		run.CompletedAt = run.StartedAt
	}
	if run.Status == RunStatusSucceeded {
		run.ErrorCode = ""
		run.ErrorMessage = ""
	}
	return run
}

func normalizeRecentRunsLimit(limit int) int {
	if limit <= 0 {
		return defaultRecentRunsLimit
	}
	if limit > maxRecentRunsLimit {
		return maxRecentRunsLimit
	}
	return limit
}

func normalizeRecentRunsOffset(offset int) int {
	if offset < 0 {
		return 0
	}
	return offset
}

func normalizeProbeRecord(probe ProbeRecord) ProbeRecord {
	probe.ProviderID = strings.TrimSpace(probe.ProviderID)
	probe.ProviderKind = strings.TrimSpace(probe.ProviderKind)
	probe.DisplayName = strings.TrimSpace(probe.DisplayName)
	probe.StatusState = strings.TrimSpace(probe.StatusState)
	probe.StatusMessage = strings.TrimSpace(probe.StatusMessage)
	probe.ResolvedBinary = strings.TrimSpace(probe.ResolvedBinary)
	probe.BaseURL = strings.TrimSpace(probe.BaseURL)
	probe.Model = strings.TrimSpace(probe.Model)
	probe.PrepareState = strings.TrimSpace(probe.PrepareState)
	probe.PrepareMessage = strings.TrimSpace(probe.PrepareMessage)
	if probe.ProbeLatencyMS < 0 {
		probe.ProbeLatencyMS = 0
	}
	if probe.PrepareLatencyMS < 0 {
		probe.PrepareLatencyMS = 0
	}
	if probe.CheckedAt.IsZero() {
		probe.CheckedAt = time.Now().UTC()
	}
	if probe.PreparedAt != nil {
		preparedAt := probe.PreparedAt.UTC()
		probe.PreparedAt = &preparedAt
	}
	return probe
}

func normalizeRequestMode(mode string) string {
	switch strings.TrimSpace(strings.ToLower(mode)) {
	case RunModeSync:
		return RunModeSync
	default:
		return RunModeStream
	}
}

func normalizeRunStatusFilter(status string) string {
	switch strings.TrimSpace(strings.ToLower(status)) {
	case RunStatusSucceeded:
		return RunStatusSucceeded
	case RunStatusFailed:
		return RunStatusFailed
	case RunStatusCancelled:
		return RunStatusCancelled
	default:
		return ""
	}
}

func normalizeRunStatus(status string) string {
	switch strings.TrimSpace(strings.ToLower(status)) {
	case RunStatusCancelled:
		return RunStatusCancelled
	case RunStatusFailed:
		return RunStatusFailed
	default:
		return RunStatusSucceeded
	}
}

func scanRunRecord(scanner interface {
	Scan(dest ...any) error
}) (RunRecord, error) {
	var run RunRecord
	var startedAt string
	var completedAt string
	if err := scanner.Scan(
		&run.ID,
		&run.ProviderID,
		&run.ProviderKind,
		&run.ProviderDisplayName,
		&run.ActorUsername,
		&run.ActorHomeDir,
		&run.RequestMode,
		&run.Model,
		&run.ConversationID,
		&run.Status,
		&run.ErrorCode,
		&run.ErrorMessage,
		&run.RouteReady,
		&run.RouteStatusState,
		&run.RouteStatusMessage,
		&run.RoutePrepared,
		&run.RoutePrepareState,
		&run.RoutePrepareMessage,
		&run.ResolvedBinary,
		&run.BaseURL,
		&run.DurationMS,
		&run.FirstResponseLatencyMS,
		&startedAt,
		&completedAt,
	); err != nil {
		return RunRecord{}, fmt.Errorf("scan provider gateway run: %w", err)
	}
	parsedStartedAt, err := time.Parse(time.RFC3339Nano, startedAt)
	if err != nil {
		return RunRecord{}, fmt.Errorf("parse provider gateway started_at: %w", err)
	}
	parsedCompletedAt, err := time.Parse(time.RFC3339Nano, completedAt)
	if err != nil {
		return RunRecord{}, fmt.Errorf("parse provider gateway completed_at: %w", err)
	}
	run.StartedAt = parsedStartedAt
	run.CompletedAt = parsedCompletedAt
	return normalizeRunRecord(run), nil
}

func scanProviderStats(scanner interface {
	Scan(dest ...any) error
}) (ProviderStats, error) {
	var stats ProviderStats
	var startedAt string
	var completedAt string
	if err := scanner.Scan(
		&stats.ProviderID,
		&stats.ProviderKind,
		&stats.ProviderDisplayName,
		&stats.TotalRuns,
		&stats.SucceededRuns,
		&stats.FailedRuns,
		&stats.CancelledRuns,
		&stats.AverageDurationMS,
		&stats.AverageFirstResponseLatencyMS,
		&stats.LastDurationMS,
		&stats.LastFirstResponseLatencyMS,
		&stats.LastStatus,
		&stats.LastErrorCode,
		&stats.LastErrorMessage,
		&startedAt,
		&completedAt,
	); err != nil {
		return ProviderStats{}, fmt.Errorf("scan provider gateway stats: %w", err)
	}

	if strings.TrimSpace(startedAt) != "" {
		parsedStartedAt, err := time.Parse(time.RFC3339Nano, startedAt)
		if err != nil {
			return ProviderStats{}, fmt.Errorf("parse provider gateway stats started_at: %w", err)
		}
		stats.LastStartedAt = &parsedStartedAt
	}
	if strings.TrimSpace(completedAt) != "" {
		parsedCompletedAt, err := time.Parse(time.RFC3339Nano, completedAt)
		if err != nil {
			return ProviderStats{}, fmt.Errorf("parse provider gateway stats completed_at: %w", err)
		}
		stats.LastCompletedAt = &parsedCompletedAt
	}
	stats.LastStatus = normalizeRunStatus(stats.LastStatus)
	stats.ProviderID = strings.TrimSpace(stats.ProviderID)
	stats.ProviderKind = strings.TrimSpace(stats.ProviderKind)
	stats.ProviderDisplayName = strings.TrimSpace(stats.ProviderDisplayName)
	stats.LastErrorCode = strings.TrimSpace(stats.LastErrorCode)
	stats.LastErrorMessage = strings.TrimSpace(stats.LastErrorMessage)
	if stats.AverageDurationMS < 0 {
		stats.AverageDurationMS = 0
	}
	if stats.LastDurationMS < 0 {
		stats.LastDurationMS = 0
	}
	if stats.AverageFirstResponseLatencyMS < 0 {
		stats.AverageFirstResponseLatencyMS = 0
	}
	if stats.LastFirstResponseLatencyMS < 0 {
		stats.LastFirstResponseLatencyMS = 0
	}
	return stats, nil
}

func scanProbeRecord(scanner interface {
	Scan(dest ...any) error
}) (ProbeRecord, error) {
	var probe ProbeRecord
	var checkedAt string
	var preparedAt string
	if err := scanner.Scan(
		&probe.ProviderID,
		&probe.ProviderKind,
		&probe.DisplayName,
		&probe.Ready,
		&probe.StatusState,
		&probe.StatusMessage,
		&probe.ResolvedBinary,
		&probe.BaseURL,
		&probe.Model,
		&probe.ProbeLatencyMS,
		&checkedAt,
		&probe.Prepared,
		&probe.PrepareState,
		&probe.PrepareMessage,
		&probe.PrepareLatencyMS,
		&preparedAt,
	); err != nil {
		return ProbeRecord{}, fmt.Errorf("scan provider gateway probe: %w", err)
	}
	parsedCheckedAt, err := time.Parse(time.RFC3339Nano, checkedAt)
	if err != nil {
		return ProbeRecord{}, fmt.Errorf("parse provider gateway probe checked_at: %w", err)
	}
	probe.CheckedAt = parsedCheckedAt
	if strings.TrimSpace(preparedAt) != "" {
		parsedPreparedAt, err := time.Parse(time.RFC3339Nano, preparedAt)
		if err != nil {
			return ProbeRecord{}, fmt.Errorf("parse provider gateway probe prepared_at: %w", err)
		}
		probe.PreparedAt = &parsedPreparedAt
	}
	return normalizeProbeRecord(probe), nil
}
