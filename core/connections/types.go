package connections

import "time"

type Kind string

const (
	KindLocal Kind = "local"
	KindSSH   Kind = "ssh"
)

type Status string

const (
	StatusReady      Status = "ready"
	StatusConfigured Status = "configured"
)

type CheckStatus string

const (
	CheckStatusUnchecked CheckStatus = "unchecked"
	CheckStatusPassed    CheckStatus = "passed"
	CheckStatusFailed    CheckStatus = "failed"
)

type LaunchStatus string

const (
	LaunchStatusIdle      LaunchStatus = "idle"
	LaunchStatusSucceeded LaunchStatus = "succeeded"
	LaunchStatusFailed    LaunchStatus = "failed"
)

type Usability string

const (
	UsabilityAvailable Usability = "available"
	UsabilityAttention Usability = "attention"
	UsabilityUnknown   Usability = "unknown"
)

type SSHConfig struct {
	Host         string `json:"host"`
	User         string `json:"user,omitempty"`
	Port         int    `json:"port,omitempty"`
	IdentityFile string `json:"identity_file,omitempty"`
}

type RuntimeState struct {
	CheckStatus    CheckStatus  `json:"check_status"`
	CheckError     string       `json:"check_error,omitempty"`
	LastCheckedAt  *time.Time   `json:"last_checked_at,omitempty"`
	LaunchStatus   LaunchStatus `json:"launch_status"`
	LaunchError    string       `json:"launch_error,omitempty"`
	LastLaunchedAt *time.Time   `json:"last_launched_at,omitempty"`
}

type Connection struct {
	ID          string       `json:"id"`
	Kind        Kind         `json:"kind"`
	Name        string       `json:"name"`
	Description string       `json:"description,omitempty"`
	Status      Status       `json:"status"`
	Active      bool         `json:"active"`
	Builtin     bool         `json:"builtin,omitempty"`
	Usability   Usability    `json:"usability"`
	Runtime     RuntimeState `json:"runtime"`
	SSH         *SSHConfig   `json:"ssh,omitempty"`
}

type Snapshot struct {
	Connections        []Connection `json:"connections"`
	ActiveConnectionID string       `json:"active_connection_id"`
}

type SaveSSHInput struct {
	ID           string `json:"id,omitempty"`
	Name         string `json:"name,omitempty"`
	Host         string `json:"host"`
	User         string `json:"user,omitempty"`
	Port         int    `json:"port,omitempty"`
	IdentityFile string `json:"identity_file,omitempty"`
}

type CheckResult struct {
	Status    CheckStatus
	Error     string
	CheckedAt time.Time
}
