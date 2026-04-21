package config

import "path/filepath"

type Paths struct {
	StateDir             string
	DBFile               string
	PolicyFile           string
	AuditFile            string
	AgentStateFile       string
	ConnectionsFile      string
	ConversationFile     string
	WorkspaceFile        string
	WorkspaceCatalogFile string
	ExecutionFile        string
	MCPRegistryFile      string
}

func Resolve(stateDir string) Paths {
	return Paths{
		StateDir:             stateDir,
		DBFile:               filepath.Join(stateDir, "runtime.db"),
		PolicyFile:           filepath.Join(stateDir, "policy.json"),
		AuditFile:            filepath.Join(stateDir, "audit.jsonl"),
		AgentStateFile:       filepath.Join(stateDir, "agent-state.json"),
		ConnectionsFile:      filepath.Join(stateDir, "connections.json"),
		ConversationFile:     filepath.Join(stateDir, "conversation.json"),
		WorkspaceFile:        filepath.Join(stateDir, "workspace.json"),
		WorkspaceCatalogFile: filepath.Join(stateDir, "workspaces.json"),
		ExecutionFile:        filepath.Join(stateDir, "execution-blocks.json"),
		MCPRegistryFile:      filepath.Join(stateDir, "mcp-registry.json"),
	}
}
