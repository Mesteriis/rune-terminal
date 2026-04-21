package tasks

import "time"

const (
	TaskStatusPending = "pending"
	TaskStatusRunning = "running"
	TaskStatusDone    = "done"
	TaskStatusFailed  = "failed"
)

type Task struct {
	ID         string     `json:"id"`
	Type       string     `json:"type"`
	Payload    string     `json:"payload"`
	Status     string     `json:"status"`
	RunAt      time.Time  `json:"run_at"`
	LockedBy   string     `json:"locked_by"`
	LockedAt   *time.Time `json:"locked_at"`
	CreatedAt  time.Time  `json:"created_at"`
	StartedAt  *time.Time `json:"started_at"`
	FinishedAt *time.Time `json:"finished_at"`
	Error      string     `json:"error"`
}

type TaskEvent struct {
	ID        int64     `json:"id"`
	TaskID    string    `json:"task_id"`
	From      string    `json:"from_status"`
	To        string    `json:"to_status"`
	WorkerID  string    `json:"worker_id"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"created_at"`
}

type TaskStats struct {
	Pending int `json:"pending"`
	Running int `json:"running"`
	Done    int `json:"done"`
	Failed  int `json:"failed"`
}
