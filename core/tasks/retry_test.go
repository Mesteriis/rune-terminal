package tasks

import (
	"context"
	"errors"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/Mesteriis/rune-terminal/core/db"
)

func TestCreateTaskRetryPolicyDefaultsToNoRetry(t *testing.T) {
	t.Parallel()

	store := newTaskTestStore(t)
	service := NewService(store)

	task, err := service.Create(context.Background(), CreateTaskRequest{
		Type: "example.sleep",
	})
	if err != nil {
		t.Fatalf("create task failed: %v", err)
	}

	if task.MaxRetries != 0 || task.RetryBackoffSeconds != 0 || task.RetryCount != 0 {
		t.Fatalf("unexpected default retry policy: %#v", task)
	}
}

func TestCreateTaskRetryPolicyPersists(t *testing.T) {
	t.Parallel()

	store := newTaskTestStore(t)
	service := NewService(store)
	maxRetries := 3
	backoff := 5

	task, err := service.Create(context.Background(), CreateTaskRequest{
		Type:                "example.sleep",
		MaxRetries:          &maxRetries,
		RetryBackoffSeconds: &backoff,
	})
	if err != nil {
		t.Fatalf("create task failed: %v", err)
	}

	persisted, err := store.GetTask(context.Background(), task.ID)
	if err != nil {
		t.Fatalf("get task failed: %v", err)
	}
	if persisted.MaxRetries != maxRetries || persisted.RetryBackoffSeconds != backoff {
		t.Fatalf("unexpected persisted retry policy: %#v", persisted)
	}
}

func TestCreateTaskRollsBackWhenEventInsertFails(t *testing.T) {
	t.Parallel()

	store := newTaskTestStore(t)
	if _, err := store.db.ExecContext(context.Background(), `DROP TABLE task_events`); err != nil {
		t.Fatalf("drop task_events failed: %v", err)
	}

	_, err := store.CreateTask(context.Background(), "task_create_no_event", "example.sleep", `{}`, time.Now().UTC(), 0, 0)
	if err == nil {
		t.Fatalf("expected create task event insert failure")
	}
	if _, err := store.GetTask(context.Background(), "task_create_no_event"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected failed create to roll back task row, got %v", err)
	}
}

func TestFailSchedulesRetryAndClaimHonorsNextRetryAt(t *testing.T) {
	t.Parallel()

	store := newTaskTestStore(t)
	now := time.Now().UTC()
	task, err := store.CreateTask(context.Background(), "task_retry_1", "example.sleep", `{}`, now, 2, 2)
	if err != nil {
		t.Fatalf("create task failed: %v", err)
	}

	claimed, err := store.ClaimReadyTasks(context.Background(), "watcher_a", 1, now.Add(time.Millisecond))
	if err != nil {
		t.Fatalf("claim failed: %v", err)
	}
	if len(claimed) != 1 {
		t.Fatalf("expected one claimed task, got %d", len(claimed))
	}

	if err := store.MarkTaskFailed(context.Background(), task.ID, "watcher_a", "boom-1"); err != nil {
		t.Fatalf("mark failed failed: %v", err)
	}

	afterFail, err := store.GetTask(context.Background(), task.ID)
	if err != nil {
		t.Fatalf("get task failed: %v", err)
	}
	if afterFail.Status != TaskStatusPending {
		t.Fatalf("expected pending after retry scheduling, got %s", afterFail.Status)
	}
	if afterFail.RetryCount != 1 {
		t.Fatalf("expected retry_count=1, got %d", afterFail.RetryCount)
	}
	if afterFail.NextRetryAt == nil {
		t.Fatal("expected next_retry_at to be set")
	}
	if afterFail.LockedBy != "" || afterFail.StartedAt != nil || afterFail.FinishedAt != nil {
		t.Fatalf("expected running ownership to be cleared, got %#v", afterFail)
	}

	earlyClaim, err := store.ClaimReadyTasks(context.Background(), "watcher_b", 1, afterFail.NextRetryAt.Add(-time.Millisecond))
	if err != nil {
		t.Fatalf("early claim failed: %v", err)
	}
	if len(earlyClaim) != 0 {
		t.Fatalf("expected no claim before next_retry_at, got %d", len(earlyClaim))
	}

	readyClaim, err := store.ClaimReadyTasks(context.Background(), "watcher_b", 1, afterFail.NextRetryAt.Add(time.Millisecond))
	if err != nil {
		t.Fatalf("ready claim failed: %v", err)
	}
	if len(readyClaim) != 1 {
		t.Fatalf("expected one claim after next_retry_at, got %d", len(readyClaim))
	}
}

func TestRetryEventuallySucceeds(t *testing.T) {
	t.Parallel()

	store := newTaskTestStore(t)
	now := time.Now().UTC()
	task, err := store.CreateTask(context.Background(), "task_retry_2", "example.sleep", `{}`, now, 2, 1)
	if err != nil {
		t.Fatalf("create task failed: %v", err)
	}

	claimed, err := store.ClaimReadyTasks(context.Background(), "watcher_a", 1, now.Add(time.Millisecond))
	if err != nil {
		t.Fatalf("claim failed: %v", err)
	}
	if len(claimed) != 1 {
		t.Fatalf("expected one claim, got %d", len(claimed))
	}
	if err := store.MarkTaskFailed(context.Background(), task.ID, "watcher_a", "first_fail"); err != nil {
		t.Fatalf("mark failed failed: %v", err)
	}

	retryTask, err := store.GetTask(context.Background(), task.ID)
	if err != nil {
		t.Fatalf("get retry task failed: %v", err)
	}
	if retryTask.NextRetryAt == nil {
		t.Fatal("expected next_retry_at for retry task")
	}

	claimedRetry, err := store.ClaimReadyTasks(context.Background(), "watcher_a", 1, retryTask.NextRetryAt.Add(time.Millisecond))
	if err != nil {
		t.Fatalf("retry claim failed: %v", err)
	}
	if len(claimedRetry) != 1 {
		t.Fatalf("expected retry claim, got %d", len(claimedRetry))
	}
	if err := store.MarkTaskDone(context.Background(), task.ID, "watcher_a"); err != nil {
		t.Fatalf("mark done failed: %v", err)
	}

	doneTask, err := store.GetTask(context.Background(), task.ID)
	if err != nil {
		t.Fatalf("get done task failed: %v", err)
	}
	if doneTask.Status != TaskStatusDone {
		t.Fatalf("expected done status, got %s", doneTask.Status)
	}
	if doneTask.Error != "" || doneTask.NextRetryAt != nil {
		t.Fatalf("expected retry metadata to be cleared on success, got %#v", doneTask)
	}
}

func TestRetryExhaustionAndVisibility(t *testing.T) {
	t.Parallel()

	store := newTaskTestStore(t)
	now := time.Now().UTC()
	task, err := store.CreateTask(context.Background(), "task_retry_3", "example.sleep", `{}`, now, 1, 1)
	if err != nil {
		t.Fatalf("create task failed: %v", err)
	}

	if _, err := store.ClaimReadyTasks(context.Background(), "watcher_a", 1, now.Add(time.Millisecond)); err != nil {
		t.Fatalf("claim failed: %v", err)
	}
	if err := store.MarkTaskFailed(context.Background(), task.ID, "watcher_a", "first_fail"); err != nil {
		t.Fatalf("mark failed failed: %v", err)
	}

	retryTask, err := store.GetTask(context.Background(), task.ID)
	if err != nil {
		t.Fatalf("get retry task failed: %v", err)
	}
	if retryTask.NextRetryAt == nil {
		t.Fatal("expected retry scheduling")
	}
	if _, err := store.ClaimReadyTasks(context.Background(), "watcher_a", 1, retryTask.NextRetryAt.Add(time.Millisecond)); err != nil {
		t.Fatalf("second claim failed: %v", err)
	}
	if err := store.MarkTaskFailed(context.Background(), task.ID, "watcher_a", "second_fail"); err != nil {
		t.Fatalf("second mark failed failed: %v", err)
	}

	finalTask, err := store.GetTask(context.Background(), task.ID)
	if err != nil {
		t.Fatalf("get final task failed: %v", err)
	}
	if finalTask.Status != TaskStatusFailed {
		t.Fatalf("expected final failed status, got %s", finalTask.Status)
	}
	if finalTask.NextRetryAt != nil {
		t.Fatalf("expected next_retry_at to be cleared after retry exhaustion, got %#v", finalTask)
	}
	if finalTask.FinishedAt == nil {
		t.Fatal("expected finished_at for exhausted retry")
	}

	events, err := loadTaskEventMessages(context.Background(), store, task.ID)
	if err != nil {
		t.Fatalf("load task events failed: %v", err)
	}
	if !containsMessagePrefix(events, "retry_scheduled:") {
		t.Fatalf("expected retry_scheduled event, got %v", events)
	}
	if !containsMessagePrefix(events, "retry_exhausted:") {
		t.Fatalf("expected retry_exhausted event, got %v", events)
	}
}

func TestMarkFinalRollsBackWhenEventInsertFails(t *testing.T) {
	t.Parallel()

	store := newTaskTestStore(t)
	now := time.Now().UTC()
	task, err := store.CreateTask(context.Background(), "task_final_no_event", "example.sleep", `{}`, now, 0, 0)
	if err != nil {
		t.Fatalf("create task failed: %v", err)
	}
	if _, err := store.ClaimReadyTasks(context.Background(), "watcher_a", 1, now.Add(time.Millisecond)); err != nil {
		t.Fatalf("claim failed: %v", err)
	}
	if _, err := store.db.ExecContext(context.Background(), `DROP TABLE task_events`); err != nil {
		t.Fatalf("drop task_events failed: %v", err)
	}

	if err := store.MarkTaskDone(context.Background(), task.ID, "watcher_a"); err == nil {
		t.Fatalf("expected mark done event insert failure")
	}
	after, err := store.GetTask(context.Background(), task.ID)
	if err != nil {
		t.Fatalf("get task failed: %v", err)
	}
	if after.Status != TaskStatusRunning || after.FinishedAt != nil {
		t.Fatalf("expected failed final mark to keep running task, got %#v", after)
	}
}

func TestScheduleRetryRollsBackWhenEventInsertFails(t *testing.T) {
	t.Parallel()

	store := newTaskTestStore(t)
	now := time.Now().UTC()
	task, err := store.CreateTask(context.Background(), "task_retry_no_event", "example.sleep", `{}`, now, 2, 1)
	if err != nil {
		t.Fatalf("create task failed: %v", err)
	}
	if _, err := store.ClaimReadyTasks(context.Background(), "watcher_a", 1, now.Add(time.Millisecond)); err != nil {
		t.Fatalf("claim failed: %v", err)
	}
	if _, err := store.db.ExecContext(context.Background(), `DROP TABLE task_events`); err != nil {
		t.Fatalf("drop task_events failed: %v", err)
	}

	if err := store.MarkTaskFailed(context.Background(), task.ID, "watcher_a", "boom"); err == nil {
		t.Fatalf("expected retry event insert failure")
	}
	after, err := store.GetTask(context.Background(), task.ID)
	if err != nil {
		t.Fatalf("get task failed: %v", err)
	}
	if after.Status != TaskStatusRunning || after.RetryCount != 0 || after.NextRetryAt != nil {
		t.Fatalf("expected failed retry scheduling to keep running task, got %#v", after)
	}
}

func TestFailAllRunningForWorkerKeepsRetryStateConsistent(t *testing.T) {
	t.Parallel()

	store := newTaskTestStore(t)
	now := time.Now().UTC()
	task, err := store.CreateTask(context.Background(), "task_retry_4", "example.sleep", `{}`, now, 2, 1)
	if err != nil {
		t.Fatalf("create task failed: %v", err)
	}

	if _, err := store.ClaimReadyTasks(context.Background(), "watcher_shutdown", 1, now.Add(time.Millisecond)); err != nil {
		t.Fatalf("claim failed: %v", err)
	}

	marked, err := store.FailAllRunningForWorker(context.Background(), "watcher_shutdown", "watcher shutdown timeout")
	if err != nil {
		t.Fatalf("fail running tasks failed: %v", err)
	}
	if marked != 1 {
		t.Fatalf("expected one transitioned task, got %d", marked)
	}

	updated, err := store.GetTask(context.Background(), task.ID)
	if err != nil {
		t.Fatalf("get task failed: %v", err)
	}
	if updated.Status != TaskStatusPending {
		t.Fatalf("expected pending status after shutdown retry scheduling, got %s", updated.Status)
	}
	if updated.RetryCount != 1 || updated.NextRetryAt == nil {
		t.Fatalf("unexpected retry state after shutdown failure: %#v", updated)
	}
	if updated.LockedBy != "" {
		t.Fatalf("expected lock owner cleared, got %q", updated.LockedBy)
	}
}

func newTaskTestStore(t *testing.T) *Store {
	t.Helper()
	dbConn, err := db.Open(context.Background(), filepath.Join(t.TempDir(), "runtime.sqlite"))
	if err != nil {
		t.Fatalf("open test sqlite failed: %v", err)
	}
	t.Cleanup(func() {
		_ = dbConn.Close()
	})
	return NewStore(dbConn)
}

func loadTaskEventMessages(ctx context.Context, store *Store, taskID string) ([]string, error) {
	rows, err := store.db.QueryContext(ctx, `
		SELECT message
		FROM task_events
		WHERE task_id = ?
		ORDER BY id ASC
	`, taskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var messages []string
	for rows.Next() {
		var message string
		if err := rows.Scan(&message); err != nil {
			return nil, err
		}
		messages = append(messages, message)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return messages, nil
}

func containsMessagePrefix(messages []string, prefix string) bool {
	for _, message := range messages {
		if strings.HasPrefix(message, prefix) {
			return true
		}
	}
	return false
}
