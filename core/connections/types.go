package connections

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

type SSHConfig struct {
	Host         string `json:"host"`
	User         string `json:"user,omitempty"`
	Port         int    `json:"port,omitempty"`
	IdentityFile string `json:"identity_file,omitempty"`
}

type Connection struct {
	ID          string     `json:"id"`
	Kind        Kind       `json:"kind"`
	Name        string     `json:"name"`
	Description string     `json:"description,omitempty"`
	Status      Status     `json:"status"`
	Active      bool       `json:"active"`
	Builtin     bool       `json:"builtin,omitempty"`
	SSH         *SSHConfig `json:"ssh,omitempty"`
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
