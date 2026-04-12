package config

import "path/filepath"

type Paths struct {
	StateDir       string
	PolicyFile     string
	AuditFile      string
	AgentStateFile string
}

func Resolve(stateDir string) Paths {
	return Paths{
		StateDir:       stateDir,
		PolicyFile:     filepath.Join(stateDir, "policy.json"),
		AuditFile:      filepath.Join(stateDir, "audit.jsonl"),
		AgentStateFile: filepath.Join(stateDir, "agent-state.json"),
	}
}
