package db

import (
	"context"
	"database/sql"
	"path/filepath"
	"testing"
)

func TestRetryMigrationAppliesOnFreshDB(t *testing.T) {
	t.Parallel()

	dbConn := openMigrationTestDB(t)
	migrator := NewMigrator()
	if err := migrator.Migrate(context.Background(), dbConn); err != nil {
		t.Fatalf("migrate failed: %v", err)
	}

	assertHasColumn(t, dbConn, "tasks", "retry_count")
	assertHasColumn(t, dbConn, "tasks", "max_retries")
	assertHasColumn(t, dbConn, "tasks", "retry_backoff_seconds")
	assertHasColumn(t, dbConn, "tasks", "last_error_at")
	assertHasColumn(t, dbConn, "tasks", "next_retry_at")
}

func TestRetryMigrationAppliesOnExistingRows(t *testing.T) {
	t.Parallel()

	dbConn := openMigrationTestDB(t)
	seedLegacyTaskSchema(t, dbConn)

	migrator := NewMigrator()
	if err := migrator.Migrate(context.Background(), dbConn); err != nil {
		t.Fatalf("migrate failed: %v", err)
	}

	row := dbConn.QueryRowContext(context.Background(), `
		SELECT id, status, retry_count, max_retries, retry_backoff_seconds, last_error_at, next_retry_at
		FROM tasks
		WHERE id = 'legacy_task'
	`)
	var id string
	var status string
	var retryCount int
	var maxRetries int
	var retryBackoff int
	var lastError sql.NullString
	var nextRetry sql.NullString
	if err := row.Scan(&id, &status, &retryCount, &maxRetries, &retryBackoff, &lastError, &nextRetry); err != nil {
		t.Fatalf("scan migrated legacy row failed: %v", err)
	}
	if id != "legacy_task" || status != "pending" {
		t.Fatalf("unexpected legacy row identity: id=%s status=%s", id, status)
	}
	if retryCount != 0 || maxRetries != 0 || retryBackoff != 0 {
		t.Fatalf("unexpected retry defaults for legacy row: retry_count=%d max_retries=%d retry_backoff_seconds=%d", retryCount, maxRetries, retryBackoff)
	}
	if lastError.Valid || nextRetry.Valid {
		t.Fatalf("unexpected retry timestamps for legacy row: last_error=%v next_retry=%v", lastError, nextRetry)
	}
}

func openMigrationTestDB(t *testing.T) *sql.DB {
	t.Helper()

	dbConn, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "runtime.sqlite"))
	if err != nil {
		t.Fatalf("open sqlite failed: %v", err)
	}
	t.Cleanup(func() {
		_ = dbConn.Close()
	})
	return dbConn
}

func seedLegacyTaskSchema(t *testing.T, dbConn *sql.DB) {
	t.Helper()

	schema := `
	CREATE TABLE schema_migrations (
		version INTEGER PRIMARY KEY,
		name TEXT NOT NULL,
		applied_at TEXT NOT NULL
	);
	INSERT INTO schema_migrations(version, name, applied_at) VALUES
		(1, '0001_init.sql', '2026-04-21T00:00:00Z'),
		(2, '0002_tasks_runtime.sql', '2026-04-21T00:00:01Z'),
		(3, '0003_task_events.sql', '2026-04-21T00:00:02Z');
	CREATE TABLE tasks (
		id TEXT PRIMARY KEY,
		type TEXT NOT NULL,
		payload TEXT NOT NULL DEFAULT '{}',
		status TEXT NOT NULL,
		run_at TEXT NOT NULL,
		locked_by TEXT,
		locked_at TEXT,
		created_at TEXT NOT NULL,
		started_at TEXT,
		finished_at TEXT,
		error TEXT
	);
	INSERT INTO tasks (id, type, payload, status, run_at, created_at) VALUES
		('legacy_task', 'example.sleep', '{}', 'pending', '2026-04-21T12:00:00Z', '2026-04-21T12:00:00Z');
	`
	if _, err := dbConn.ExecContext(context.Background(), schema); err != nil {
		t.Fatalf("seed legacy schema failed: %v", err)
	}
}

func assertHasColumn(t *testing.T, dbConn *sql.DB, tableName, columnName string) {
	t.Helper()

	rows, err := dbConn.QueryContext(context.Background(), "PRAGMA table_info("+tableName+")")
	if err != nil {
		t.Fatalf("pragma table_info failed: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var cid int
		var name string
		var ctype string
		var notNull int
		var defaultValue sql.NullString
		var pk int
		if err := rows.Scan(&cid, &name, &ctype, &notNull, &defaultValue, &pk); err != nil {
			t.Fatalf("scan pragma row failed: %v", err)
		}
		if name == columnName {
			return
		}
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("iterate pragma rows failed: %v", err)
	}
	t.Fatalf("column %s not found in table %s", columnName, tableName)
}
