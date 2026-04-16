package audit

import (
	"bufio"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/Mesteriis/rune-terminal/internal/ids"
)

type Event struct {
	ID                    string    `json:"id"`
	ToolName              string    `json:"tool_name"`
	Summary               string    `json:"summary,omitempty"`
	WorkspaceID           string    `json:"workspace_id,omitempty"`
	PromptProfileID       string    `json:"prompt_profile_id,omitempty"`
	RoleID                string    `json:"role_id,omitempty"`
	ModeID                string    `json:"mode_id,omitempty"`
	SecurityPosture       string    `json:"security_posture,omitempty"`
	ApprovalTier          string    `json:"approval_tier,omitempty"`
	EffectiveApprovalTier string    `json:"effective_approval_tier,omitempty"`
	TrustedRuleID         string    `json:"trusted_rule_id,omitempty"`
	IgnoreRuleID          string    `json:"ignore_rule_id,omitempty"`
	IgnoreMode            string    `json:"ignore_mode,omitempty"`
	Success               bool      `json:"success"`
	Error                 string    `json:"error,omitempty"`
	Timestamp             time.Time `json:"timestamp"`
	ApprovalUsed          bool      `json:"approval_used,omitempty"`
	TargetSession         string    `json:"target_session,omitempty"`
	TargetConnectionID    string    `json:"target_connection_id,omitempty"`
	AffectedPaths         []string  `json:"affected_paths,omitempty"`
	AffectedWidgets       []string  `json:"affected_widgets,omitempty"`
}

type Log struct {
	mu   sync.Mutex
	path string
}

func NewLog(path string) (*Log, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, err
	}
	return &Log{path: path}, nil
}

func (l *Log) Append(event Event) error {
	l.mu.Lock()
	defer l.mu.Unlock()

	if event.ID == "" {
		event.ID = ids.New("audit")
	}
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now().UTC()
	}

	fd, err := os.OpenFile(l.path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	defer fd.Close()

	payload, err := json.Marshal(event)
	if err != nil {
		return err
	}
	if _, err := fd.Write(append(payload, '\n')); err != nil {
		return err
	}
	return nil
}

func (l *Log) List(limit int) ([]Event, error) {
	l.mu.Lock()
	defer l.mu.Unlock()

	fd, err := os.Open(l.path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return []Event{}, nil
		}
		return nil, err
	}
	defer fd.Close()

	scanner := bufio.NewScanner(fd)
	events := make([]Event, 0)
	for scanner.Scan() {
		var event Event
		if err := json.Unmarshal(scanner.Bytes(), &event); err != nil {
			continue
		}
		events = append(events, event)
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	if limit > 0 && len(events) > limit {
		events = events[len(events)-limit:]
	}
	return events, nil
}
