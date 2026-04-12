package terminal

import (
	"context"
	"os"
	"time"
)

type Status string

const (
	StatusStarting Status = "starting"
	StatusRunning  Status = "running"
	StatusExited   Status = "exited"
	StatusFailed   Status = "failed"
)

type State struct {
	WidgetID     string     `json:"widget_id"`
	SessionID    string     `json:"session_id"`
	Shell        string     `json:"shell"`
	PID          int        `json:"pid"`
	Status       Status     `json:"status"`
	StartedAt    time.Time  `json:"started_at"`
	LastOutputAt *time.Time `json:"last_output_at,omitempty"`
	ExitCode     *int       `json:"exit_code,omitempty"`
	CanSendInput bool       `json:"can_send_input"`
	CanInterrupt bool       `json:"can_interrupt"`
	WorkingDir   string     `json:"working_dir,omitempty"`
}

type OutputChunk struct {
	Seq       uint64    `json:"seq"`
	Data      string    `json:"data"`
	Timestamp time.Time `json:"timestamp"`
}

type Snapshot struct {
	State   State         `json:"state"`
	Chunks  []OutputChunk `json:"chunks"`
	NextSeq uint64        `json:"next_seq"`
}

type LaunchOptions struct {
	WidgetID   string
	Shell      string
	WorkingDir string
}

type InputResult struct {
	WidgetID      string `json:"widget_id"`
	BytesSent     int    `json:"bytes_sent"`
	AppendNewline bool   `json:"append_newline"`
}

type Process interface {
	PID() int
	Write([]byte) (int, error)
	Output() <-chan []byte
	Wait() (int, error)
	Signal(os.Signal) error
	Close() error
}

type Launcher interface {
	Launch(context.Context, LaunchOptions) (Process, error)
}
