package tasks

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/Mesteriis/rune-terminal/internal/ids"
)

type Service struct {
	store *Store
}

type CreateTaskRequest struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
	RunAt   string          `json:"run_at"`
}

type ClaimTaskRequest struct {
	WorkerID string `json:"worker_id"`
	Limit    int    `json:"limit"`
}

type UpdateTaskRequest struct {
	WorkerID string `json:"worker_id"`
	Error    string `json:"error"`
}

type TaskServiceError struct {
	Code  string
	Err   error
	Value any
}

func (e TaskServiceError) Error() string {
	if e.Code == "" {
		return e.Err.Error()
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Err)
}

var (
	ErrTypeRequired  = errors.New("task type is required")
	ErrWorkerMissing = errors.New("worker_id is required")
)

func NewService(store *Store) *Service {
	return &Service{store: store}
}

func (s *Service) Create(ctx context.Context, request CreateTaskRequest) (Task, error) {
	taskType := strings.TrimSpace(request.Type)
	if taskType == "" {
		return Task{}, ErrTypeRequired
	}
	payload, err := canonicalizePayload(request.Payload)
	if err != nil {
		return Task{}, err
	}

	runAt := time.Now().UTC()
	if strings.TrimSpace(request.RunAt) != "" {
		parsedAt, err := time.Parse(time.RFC3339Nano, request.RunAt)
		if err != nil {
			parsedAt, err = time.Parse(time.RFC3339, request.RunAt)
			if err != nil {
				return Task{}, fmt.Errorf("invalid run_at: %w", err)
			}
		}
		runAt = parsedAt.UTC()
	}

	return s.store.CreateTask(ctx, ids.New("task"), taskType, payload, runAt)
}

func (s *Service) Claim(ctx context.Context, request ClaimTaskRequest) ([]Task, error) {
	request.WorkerID = strings.TrimSpace(request.WorkerID)
	if request.WorkerID == "" {
		return nil, ErrWorkerMissing
	}
	if request.Limit <= 0 {
		request.Limit = 10
	}
	if request.Limit > 100 {
		request.Limit = 100
	}
	return s.store.ClaimReadyTasks(ctx, request.WorkerID, request.Limit, time.Now().UTC())
}

func (s *Service) Done(ctx context.Context, taskID string, request UpdateTaskRequest) error {
	request.WorkerID = strings.TrimSpace(request.WorkerID)
	if request.WorkerID == "" {
		return ErrWorkerMissing
	}
	return s.store.MarkTaskDone(ctx, taskID, request.WorkerID)
}

func (s *Service) Fail(ctx context.Context, taskID string, request UpdateTaskRequest) error {
	request.WorkerID = strings.TrimSpace(request.WorkerID)
	request.Error = strings.TrimSpace(request.Error)
	if request.WorkerID == "" {
		return ErrWorkerMissing
	}
	if request.Error == "" {
		request.Error = "task failed"
	}
	return s.store.MarkTaskFailed(ctx, taskID, request.WorkerID, request.Error)
}

func canonicalizePayload(raw json.RawMessage) (string, error) {
	if len(strings.TrimSpace(string(raw))) == 0 {
		return "{}", nil
	}
	var decoded any
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return "", fmt.Errorf("invalid payload: %w", err)
	}
	encoded, err := json.Marshal(decoded)
	if err != nil {
		return "", err
	}
	return string(encoded), nil
}

func (s *Service) Active(ctx context.Context) ([]Task, error) {
	return s.store.ListActiveTasks(ctx)
}

func (s *Service) Stats(ctx context.Context) (TaskStats, error) {
	return s.store.CountTaskStats(ctx)
}

func (s *Service) FailAllByWorker(ctx context.Context, workerID string, reason string) (int, error) {
	return s.store.FailAllRunningForWorker(ctx, workerID, reason)
}
