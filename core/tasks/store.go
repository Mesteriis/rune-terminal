package tasks

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
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

func NewStore(dbConn *sql.DB) *Store {
	return &Store{db: dbConn}
}

func (s *Store) CreateTask(ctx context.Context, taskID, taskType, payload string, runAt time.Time) (Task, error) {
	now := time.Now().UTC()
	task := Task{
		ID:        taskID,
		Type:      taskType,
		Payload:   payload,
		Status:    TaskStatusPending,
		RunAt:     runAt.UTC(),
		CreatedAt: now,
	}
	if _, err := s.db.ExecContext(ctx,
		`INSERT INTO tasks (id, type, payload, status, run_at, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
		task.ID,
		task.Type,
		task.Payload,
		task.Status,
		task.RunAt.Format(time.RFC3339Nano),
		task.CreatedAt.Format(time.RFC3339Nano),
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
		SELECT id, type, payload, status, run_at, locked_by, locked_at, created_at, started_at, finished_at, error
		FROM tasks
		WHERE status = ? AND run_at <= ? AND locked_by IS NULL
		ORDER BY run_at ASC
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
	nowStr := now.Format(time.RFC3339Nano)
	if _, err := s.db.ExecContext(ctx,
		`UPDATE tasks
			SET status = ?, finished_at = ?, error = ?
			WHERE id = ? AND status = ? AND locked_by = ?`,
		nextStatus, nowStr, message, id, TaskStatusRunning, workerID,
	); err != nil {
		return err
	}
	return s.logEvent(ctx, task.Status, id, workerID, nextStatus, message)
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
		SELECT id, type, payload, status, run_at, locked_by, locked_at, created_at, started_at, finished_at, error
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
		SELECT id, type, payload, status, run_at, locked_by, locked_at, created_at, started_at, finished_at, error
		FROM tasks
		WHERE status = ?
		ORDER BY run_at ASC
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
	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return 0, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	tasksByWorker, err := queryTasksTx(ctx, tx, `
		SELECT id, type, payload, status, run_at, locked_by, locked_at, created_at, started_at, finished_at, error
		FROM tasks
		WHERE status = ? AND locked_by = ?
	`, TaskStatusRunning, workerID)
	if err != nil {
		return 0, err
	}
	if len(tasksByWorker) == 0 {
		if err := tx.Commit(); err != nil {
			return 0, err
		}
		return 0, nil
	}

	now := time.Now().UTC().Format(time.RFC3339Nano)
	if _, err := tx.ExecContext(ctx, `
		UPDATE tasks
		SET status = ?, finished_at = ?, error = ?
		WHERE status = ? AND locked_by = ?
	`, TaskStatusFailed, now, reason, TaskStatusRunning, workerID); err != nil {
		return 0, err
	}
	for _, task := range tasksByWorker {
		if err := s.logEventTx(ctx, tx, TaskStatusRunning, task.ID, workerID, TaskStatusFailed, reason); err != nil {
			return 0, err
		}
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return len(tasksByWorker), nil
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
	var runAtStr, lockedAtStr, createdAtStr, startedAtStr, finishedAtStr string
	if err := scanner.Scan(
		&task.ID,
		&task.Type,
		&task.Payload,
		&task.Status,
		&runAtStr,
		&task.LockedBy,
		&lockedAtStr,
		&createdAtStr,
		&startedAtStr,
		&finishedAtStr,
		&task.Error,
	); err != nil {
		return Task{}, err
	}
	task.RunAt = parseTime(runAtStr)
	task.CreatedAt = parseTime(createdAtStr)
	if lockedAtStr != "" {
		lockedAt := parseTime(lockedAtStr)
		task.LockedAt = &lockedAt
	}
	if startedAtStr != "" {
		startedAt := parseTime(startedAtStr)
		task.StartedAt = &startedAt
	}
	if finishedAtStr != "" {
		finishedAt := parseTime(finishedAtStr)
		task.FinishedAt = &finishedAt
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
