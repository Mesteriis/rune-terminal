package app

import (
	"context"

	"github.com/Mesteriis/rune-terminal/core/agent"
	"github.com/Mesteriis/rune-terminal/core/audit"
	"github.com/Mesteriis/rune-terminal/core/config"
	"github.com/Mesteriis/rune-terminal/core/connections"
	"github.com/Mesteriis/rune-terminal/core/conversation"
	"github.com/Mesteriis/rune-terminal/core/plugins"
	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/terminal"
	"github.com/Mesteriis/rune-terminal/core/toolruntime"
	"github.com/Mesteriis/rune-terminal/core/workspace"
)

type Runtime struct {
	RepoRoot     string
	Paths        config.Paths
	Workspace    *workspace.Service
	Terminals    *terminal.Service
	Connections  *connections.Service
	Agent        *agent.Store
	Conversation *conversation.Service
	Policy       *policy.Store
	Audit        *audit.Log
	Plugins      *plugins.Runtime
	MCP          *plugins.MCPRuntime
	Registry     *toolruntime.Registry
	Executor     *toolruntime.Executor
}

func NewRuntime(repoRoot string, stateDir string) (*Runtime, error) {
	paths := config.Resolve(stateDir)

	auditLog, err := audit.NewLog(paths.AuditFile)
	if err != nil {
		return nil, err
	}
	policyStore, err := policy.NewStore(paths.PolicyFile, repoRoot)
	if err != nil {
		return nil, err
	}
	connectionStore, err := connections.NewService(paths.ConnectionsFile)
	if err != nil {
		return nil, err
	}
	agentStore, err := agent.NewStore(paths.AgentStateFile)
	if err != nil {
		return nil, err
	}
	conversationStore, err := conversation.NewService(paths.ConversationFile, conversation.NewOllamaProvider(conversation.DefaultProviderConfig()))
	if err != nil {
		return nil, err
	}
	workspaceSnapshot, err := workspace.LoadSnapshot(paths.WorkspaceFile, workspace.BootstrapDefault())
	if err != nil {
		return nil, err
	}

	runtime := &Runtime{
		RepoRoot:     repoRoot,
		Paths:        paths,
		Workspace:    workspace.NewService(workspaceSnapshot),
		Terminals:    terminal.NewService(terminal.DefaultLauncher()),
		Connections:  connectionStore,
		Agent:        agentStore,
		Conversation: conversationStore,
		Policy:       policyStore,
		Audit:        auditLog,
		Plugins:      plugins.NewRuntime(nil, 0),
		Registry:     toolruntime.NewRegistry(),
	}
	runtime.MCP = plugins.NewMCPRuntime(nil, nil, newExternalMCPInvoker(runtime.Plugins, repoRoot))
	runtime.Executor = toolruntime.NewExecutor(
		runtime.Registry,
		runtime.Policy,
		runtime.Audit,
		toolruntime.WithPluginInvoker(runtime.Plugins),
	)
	if err := runtime.persistWorkspaceSnapshot(runtime.Workspace.Snapshot()); err != nil {
		return nil, err
	}

	if err := runtime.bootstrapSessions(context.Background()); err != nil {
		return nil, err
	}
	if err := runtime.registerTools(); err != nil {
		return nil, err
	}
	if err := runtime.registerMCPServers(); err != nil {
		return nil, err
	}
	return runtime, nil
}

func (r *Runtime) bootstrapSessions(ctx context.Context) error {
	for _, widget := range r.Workspace.ListWidgets() {
		if widget.Kind != workspace.WidgetKindTerminal {
			continue
		}
		connection, err := r.connectionForWidget(widget.ConnectionID)
		if err != nil {
			_, _, _ = r.Connections.ReportLaunchResult(widget.ConnectionID, err)
			return err
		}
		if _, err := r.Terminals.StartSession(ctx, terminal.LaunchOptions{
			WidgetID:   widget.ID,
			WorkingDir: r.RepoRoot,
			Connection: connection,
			Restored:   true,
		}); err != nil {
			_, _, _ = r.Connections.ReportLaunchResult(widget.ConnectionID, err)
			return err
		}
		_, _, _ = r.Connections.ReportLaunchResult(widget.ConnectionID, nil)
	}
	return nil
}

func (r *Runtime) connectionForWidget(connectionID string) (terminal.ConnectionSpec, error) {
	if connectionID == "" {
		connectionID = "local"
	}
	connection, err := r.Connections.Resolve(connectionID)
	if err != nil {
		return terminal.ConnectionSpec{}, err
	}
	spec := terminal.ConnectionSpec{
		ID:   connection.ID,
		Name: connection.Name,
		Kind: string(connection.Kind),
	}
	if connection.SSH != nil {
		spec.SSH = &terminal.SSHConfig{
			Host:         connection.SSH.Host,
			User:         connection.SSH.User,
			Port:         connection.SSH.Port,
			IdentityFile: connection.SSH.IdentityFile,
		}
	}
	return spec, nil
}
