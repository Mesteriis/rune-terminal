package tasks

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

type Store struct {
	db *sql.DB
}

var (
	ErrNotFound      = errors.New("task not found")
	ErrWrongOwner    = errors.New("task owned by another worker")
	ErrInvalidStatus = errors.New("task is not in expected status")
)

const taskSelectColumns = `
id, type, payload, status, run_at, locked_by, locked_at, created_at, started_at, finished_at, error,
retry_count, max_retries, retry_backoff_seconds, last_error_at, next_retry_at
`

func NewStore(dbConn *sql.DB) *Store {
	return &Store{db: dbConn}
}

func (s *Store) CreateTask(
	ctx context.Context,
	taskID,
	taskType,
	payload string,
	runAt time.Time,
	maxRetries int,
	retryBackoffSeconds int,
) (Task, error) {
	now := time.Now().UTC()
	task := Task{
		ID:                  taskID,
		Type:                taskType,
		Payload:             payload,
		Status:              TaskStatusPending,
		RunAt:               runAt.UTC(),
		CreatedAt:           now,
		MaxRetries:          maxRetries,
		RetryBackoffSeconds: retryBackoffSeconds,
	}
	if _, err := s.db.ExecContext(ctx,
		`INSERT INTO tasks
			(id, type, payload, status, run_at, created_at, retry_count, max_retries, retry_backoff_seconds)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		task.ID,
		task.Type,
		task.Payload,
		task.Status,
		task.RunAt.Format(time.RFC3339Nano),
		task.CreatedAt.Format(time.RFC3339Nano),
		task.RetryCount,
		task.MaxRetries,
		task.RetryBackoffSeconds,
	); err != nil {
		return Task{}, err
	}
	if err := s.logEvent(ctx, "", task.ID, "", task.Status, "created"); err != nil {
		return Task{}, err
	}
	return task, nil
}

func (s *Store) ClaimReadyTasks(ctx context.Context, workerID string, limit int, now time.Time) ([]Task, error) {
	if limit <= 0 {
		return nil, nil
	}
	if limit > 100 {
		limit = 100
	}

	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	candidates, err := queryTasksTx(ctx, tx, `
		SELECT `+taskSelectColumns+`
		FROM tasks
		-- Retry-scheduled tasks become claimable only after next_retry_at; first-run tasks use run_at.
		WHERE status = ? AND COALESCE(next_retry_at, run_at) <= ? AND locked_by IS NULL
		ORDER BY COALESCE(next_retry_at, run_at) ASC
		LIMIT ?
	`, TaskStatusPending, now.UTC().Format(time.RFC3339Nano), limit)
	if err != nil {
		return nil, err
	}
	if len(candidates) == 0 {
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return nil, nil
	}

	claimAt := now.UTC()
	nowLiteral := claimAt.Format(time.RFC3339Nano)
	updates := make([]Task, 0, len(candidates))
	for _, task := range candidates {
		result, err := tx.ExecContext(ctx,
			`UPDATE tasks
				SET status = ?, locked_by = ?, locked_at = ?, started_at = ?
				WHERE id = ? AND status = ? AND locked_by IS NULL`,
			TaskStatusRunning, workerID, nowLiteral, nowLiteral, task.ID, TaskStatusPending,
		)
		if err != nil {
			return nil, err
		}
		count, err := result.RowsAffected()
		if err != nil {
			return nil, err
		}
		if count == 0 {
			continue
		}
		if count != 1 {
			return nil, fmt.Errorf("claim task update affected %d rows", count)
		}
		if err := s.logEventTx(ctx, tx, task.Status, task.ID, workerID, TaskStatusRunning, "claimed"); err != nil {
			return nil, err
		}
		task.Status = TaskStatusRunning
		task.LockedBy = workerID
		task.NextRetryAt = nil
		lockedAt := claimAt
		task.LockedAt = &lockedAt
		task.StartedAt = &claimAt
		updates = append(updates, task)
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return updates, nil
}

func (s *Store) MarkTaskDone(ctx context.Context, id, workerID string) error {
	return s.markFinal(ctx, id, workerID, TaskStatusDone, "")
}

func (s *Store) MarkTaskFailed(ctx context.Context, id, workerID, reason string) error {
	return s.markFinal(ctx, id, workerID, TaskStatusFailed, reason)
}

func (s *Store) markFinal(ctx context.Context, id, workerID, nextStatus, message string) error {
	now := time.Now().UTC()
	if id == "" || workerID == "" {
		return fmt.Errorf("id and worker_id required")
	}
	task, err := s.GetTask(ctx, id)
	if err != nil {
		return err
	}
	if task.LockedBy != workerID {
		return ErrWrongOwner
	}
	if task.Status != TaskStatusRunning {
		return ErrInvalidStatus
	}
	if nextStatus == TaskStatusFailed && task.RetryCount < task.MaxRetries {
		return s.scheduleRetry(ctx, task, workerID, message)
	}

	errorMessage := strings.TrimSpace(message)
	if nextStatus == TaskStatusDone {
		errorMessage = ""
	}
	nowStr := now.Format(time.RFC3339Nano)
	if _, err := s.db.ExecContext(ctx,
		`UPDATE tasks
			SET status = ?, finished_at = ?, error = ?, last_error_at = ?, next_retry_at = ?
			WHERE id = ? AND status = ? AND locked_by = ?`,
		nextStatus,
		nowStr,
		errorMessage,
		nullableErrorTimestamp(nextStatus, now),
		nil,
		id,
		TaskStatusRunning,
		workerID,
	); err != nil {
		return err
	}
	eventMessage := errorMessage
	if nextStatus == TaskStatusFailed && task.MaxRetries > 0 && task.RetryCount >= task.MaxRetries {
		eventMessage = "retry_exhausted: " + errorMessage
	}
	return s.logEvent(ctx, task.Status, id, workerID, nextStatus, strings.TrimSpace(eventMessage))
}

func checkUpdateAffectedRows(result sql.Result, id string) (int64, error) {
	count, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("check update rows for %s: %w", id, err)
	}
	return count, nil
}

func (s *Store) GetTask(ctx context.Context, id string) (Task, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT `+taskSelectColumns+`
		FROM tasks
		WHERE id = ?
	`, id)
	task, err := scanTaskRow(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Task{}, ErrNotFound
		}
		return Task{}, err
	}
	return task, nil
}

func (s *Store) ListActiveTasks(ctx context.Context) ([]Task, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT `+taskSelectColumns+`
		FROM tasks
		WHERE status = ?
		ORDER BY COALESCE(next_retry_at, run_at) ASC
	`, TaskStatusRunning)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return queryTasksRows(rows)
}

func (s *Store) CountTaskStats(ctx context.Context) (TaskStats, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT status, COUNT(*)
		FROM tasks
		GROUP BY status
	`)
	if err != nil {
		return TaskStats{}, err
	}
	defer rows.Close()

	var stats TaskStats
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			return TaskStats{}, err
		}
		switch status {
		case TaskStatusPending:
			stats.Pending = count
		case TaskStatusRunning:
			stats.Running = count
		case TaskStatusDone:
			stats.Done = count
		case TaskStatusFailed:
			stats.Failed = count
		}
	}
	if err := rows.Err(); err != nil {
		return TaskStats{}, err
	}
	return stats, nil
}

func (s *Store) FailAllRunningForWorker(ctx context.Context, workerID, reason string) (int, error) {
	if workerID == "" {
		return 0, fmt.Errorf("worker_id required")
	}
	tasksByWorker, err := queryTasks(ctx, s.db, `
		SELECT `+taskSelectColumns+`
		FROM tasks
		WHERE status = ? AND locked_by = ?
	`, TaskStatusRunning, workerID)
	if err != nil {
		return 0, err
	}
	marked := 0
	for _, task := range tasksByWorker {
		if err := s.markFinal(ctx, task.ID, workerID, TaskStatusFailed, reason); err != nil {
			if errors.Is(err, ErrNotFound) || errors.Is(err, ErrInvalidStatus) || errors.Is(err, ErrWrongOwner) {
				continue
			}
			return marked, err
		}
		marked++
	}
	return marked, nil
}

func (s *Store) logEvent(ctx context.Context, fromStatus, taskID, workerID, toStatus, message string) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO task_events (task_id, from_status, to_status, worker_id, message, created_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		taskID, fromStatus, toStatus, workerID, message, time.Now().UTC().Format(time.RFC3339Nano),
	)
	return err
}

func (s *Store) logEventTx(ctx context.Context, tx *sql.Tx, fromStatus, taskID, workerID, toStatus, message string) error {
	_, err := tx.ExecContext(ctx,
		`INSERT INTO task_events (task_id, from_status, to_status, worker_id, message, created_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		taskID, fromStatus, toStatus, workerID, message, time.Now().UTC().Format(time.RFC3339Nano),
	)
	return err
}

func queryTasksTx(ctx context.Context, tx *sql.Tx, query string, args ...any) ([]Task, error) {
	rows, err := tx.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return queryTasksRows(rows)
}

func queryTasks(ctx context.Context, dbConn *sql.DB, query string, args ...any) ([]Task, error) {
	rows, err := dbConn.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return queryTasksRows(rows)
}

func queryTasksRows(rows *sql.Rows) ([]Task, error) {
	tasks := make([]Task, 0)
	for rows.Next() {
		task, err := scanTaskRow(rows)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, task)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return tasks, nil
}

func scanTaskRow(scanner interface {
	Scan(dest ...any) error
}) (Task, error) {
	var task Task
	var runAtStr, createdAtStr string
	var lockedBy sql.NullString
	var errorValue sql.NullString
	var lockedAtStr sql.NullString
	var startedAtStr sql.NullString
	var finishedAtStr sql.NullString
	var lastErrorAtStr sql.NullString
	var nextRetryAtStr sql.NullString
	if err := scanner.Scan(
		&task.ID,
		&task.Type,
		&task.Payload,
		&task.Status,
		&runAtStr,
		&lockedBy,
		&lockedAtStr,
		&createdAtStr,
		&startedAtStr,
		&finishedAtStr,
		&errorValue,
		&task.RetryCount,
		&task.MaxRetries,
		&task.RetryBackoffSeconds,
		&lastErrorAtStr,
		&nextRetryAtStr,
	); err != nil {
		return Task{}, err
	}
	task.RunAt = parseTime(runAtStr)
	task.CreatedAt = parseTime(createdAtStr)
	if errorValue.Valid {
		task.Error = errorValue.String
	}
	if lockedBy.Valid {
		task.LockedBy = lockedBy.String
	}
	if lockedAtStr.Valid && lockedAtStr.String != "" {
		lockedAt := parseTime(lockedAtStr.String)
		task.LockedAt = &lockedAt
	}
	if startedAtStr.Valid && startedAtStr.String != "" {
		startedAt := parseTime(startedAtStr.String)
		task.StartedAt = &startedAt
	}
	if finishedAtStr.Valid && finishedAtStr.String != "" {
		finishedAt := parseTime(finishedAtStr.String)
		task.FinishedAt = &finishedAt
	}
	if lastErrorAtStr.Valid && lastErrorAtStr.String != "" {
		lastErrorAt := parseTime(lastErrorAtStr.String)
		task.LastErrorAt = &lastErrorAt
	}
	if nextRetryAtStr.Valid && nextRetryAtStr.String != "" {
		nextRetryAt := parseTime(nextRetryAtStr.String)
		task.NextRetryAt = &nextRetryAt
	}
	return task, nil
}

func parseTime(raw string) time.Time {
	parsed, err := time.Parse(time.RFC3339Nano, raw)
	if err != nil {
		return time.Time{}
	}
	return parsed
}

func (s *Store) scheduleRetry(ctx context.Context, task Task, workerID, reason string) error {
	now := time.Now().UTC()
	nextRetryCount := task.RetryCount + 1
	delaySeconds := boundedRetryBackoffSeconds(task.RetryBackoffSeconds, task.RetryCount)
	nextRetryAt := now.Add(time.Duration(delaySeconds) * time.Second).UTC()
	retryMessage := fmt.Sprintf(
		"retry_scheduled: attempt=%d/%d delay_seconds=%d reason=%s",
		nextRetryCount,
		task.MaxRetries,
		delaySeconds,
		strings.TrimSpace(reason),
	)
	result, err := s.db.ExecContext(ctx, `
		UPDATE tasks
		SET status = ?, retry_count = ?, next_retry_at = ?, last_error_at = ?, error = ?, locked_by = NULL, locked_at = NULL, started_at = NULL, finished_at = NULL
		WHERE id = ? AND status = ? AND locked_by = ?
	`,
		TaskStatusPending,
		nextRetryCount,
		nextRetryAt.Format(time.RFC3339Nano),
		now.Format(time.RFC3339Nano),
		strings.TrimSpace(reason),
		task.ID,
		TaskStatusRunning,
		workerID,
	)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrInvalidStatus
	}
	return s.logEvent(ctx, TaskStatusRunning, task.ID, workerID, TaskStatusPending, retryMessage)
}

func boundedRetryBackoffSeconds(baseSeconds, retryCount int) int {
	if baseSeconds < 1 {
		baseSeconds = 1
	}
	if baseSeconds > 3600 {
		baseSeconds = 3600
	}
	delay := baseSeconds
	for attempt := 0; attempt < retryCount; attempt++ {
		if delay >= 1800 {
			delay = 3600
			break
		}
		delay *= 2
		if delay > 3600 {
			delay = 3600
			break
		}
	}
	return delay
}

func nullableErrorTimestamp(status string, value time.Time) any {
	if status == TaskStatusFailed {
		return value.Format(time.RFC3339Nano)
	}
	return nil
}
