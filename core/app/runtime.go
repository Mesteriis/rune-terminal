package app

import (
	"context"
	"database/sql"
	"os"
	"sync"

	"github.com/Mesteriis/rune-terminal/core/agent"
	"github.com/Mesteriis/rune-terminal/core/audit"
	"github.com/Mesteriis/rune-terminal/core/config"
	"github.com/Mesteriis/rune-terminal/core/connections"
	"github.com/Mesteriis/rune-terminal/core/conversation"
	"github.com/Mesteriis/rune-terminal/core/db"
	"github.com/Mesteriis/rune-terminal/core/execution"
	"github.com/Mesteriis/rune-terminal/core/plugins"
	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/core/tasks"
	"github.com/Mesteriis/rune-terminal/core/terminal"
	"github.com/Mesteriis/rune-terminal/core/toolruntime"
	"github.com/Mesteriis/rune-terminal/core/workspace"
)

type Runtime struct {
	RepoRoot                    string
	HomeDir                     string
	DB                          *sql.DB
	Paths                       config.Paths
	Workspace                   *workspace.Service
	WorkspaceCatalog            *workspace.CatalogStore
	Terminals                   *terminal.Service
	TerminalPreferences         *terminal.PreferencesStore
	AgentComposerPreferences    *agent.ComposerPreferencesStore
	Connections                 *connections.Service
	Agent                       *agent.Store
	Conversation                *conversation.Service
	Execution                   *execution.Service
	Policy                      *policy.Store
	Audit                       *audit.Log
	Plugins                     *plugins.Runtime
	PluginCatalog               *PluginCatalogStore
	MCP                         *plugins.MCPRuntime
	Registry                    *toolruntime.Registry
	Executor                    *toolruntime.Executor
	ConversationProviderFactory ConversationProviderFactory
	TaskStore                   *tasks.Store
	TaskService                 *tasks.Service
	conversationStreams         conversationStreamRegistry
	restoredMu                  sync.RWMutex
	restored                    map[string]terminal.State
}

func NewRuntime(repoRoot string, stateDir string) (*Runtime, error) {
	paths := config.Resolve(stateDir)
	homeDir, _ := os.UserHomeDir()

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
	pluginCatalog, err := NewPluginCatalogStore(paths.PluginCatalogFile)
	if err != nil {
		return nil, err
	}
	agentStore, err := agent.NewStore(paths.AgentStateFile)
	if err != nil {
		return nil, err
	}
	executionStore, err := execution.NewService(paths.ExecutionFile)
	if err != nil {
		return nil, err
	}
	dbConn, err := db.Open(context.Background(), paths.DBFile)
	if err != nil {
		return nil, err
	}
	conversationStore, err := conversation.NewServiceWithDB(
		dbConn,
		paths.ConversationFile,
		conversation.NewCodexCLIProvider(conversation.CodexCLIProviderConfig{}),
	)
	if err != nil {
		return nil, err
	}
	taskStore := tasks.NewStore(dbConn)
	workspaceSnapshot, err := workspace.LoadSnapshot(paths.WorkspaceFile, workspace.BootstrapDefault())
	if err != nil {
		return nil, err
	}
	workspaceCatalog, err := workspace.LoadCatalog(paths.WorkspaceCatalogFile, workspaceSnapshot)
	if err != nil {
		return nil, err
	}
	activeWorkspaceSnapshot := workspace.NewCatalogStore(workspaceCatalog).ActiveSnapshot()

	runtime := &Runtime{
		RepoRoot:                    repoRoot,
		HomeDir:                     homeDir,
		Paths:                       paths,
		Workspace:                   workspace.NewService(activeWorkspaceSnapshot),
		WorkspaceCatalog:            workspace.NewCatalogStore(workspaceCatalog),
		Terminals:                   terminal.NewService(terminal.DefaultLauncher()),
		Connections:                 connectionStore,
		Agent:                       agentStore,
		PluginCatalog:               pluginCatalog,
		Conversation:                conversationStore,
		Execution:                   executionStore,
		DB:                          dbConn,
		TaskStore:                   taskStore,
		TaskService:                 tasks.NewService(taskStore),
		Policy:                      policyStore,
		Audit:                       auditLog,
		Plugins:                     plugins.NewRuntime(nil, 0),
		Registry:                    toolruntime.NewRegistry(),
		ConversationProviderFactory: defaultConversationProviderFactory,
		conversationStreams:         newConversationStreamRegistry(),
		restored:                    make(map[string]terminal.State),
	}
	terminalPreferences, err := terminal.NewPreferencesStore(context.Background(), dbConn)
	if err != nil {
		return nil, err
	}
	runtime.TerminalPreferences = terminalPreferences
	agentComposerPreferences, err := agent.NewComposerPreferencesStore(context.Background(), dbConn)
	if err != nil {
		return nil, err
	}
	runtime.AgentComposerPreferences = agentComposerPreferences
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
	if err := runtime.syncInstalledPlugins(); err != nil {
		return nil, err
	}
	if err := runtime.registerMCPServers(); err != nil {
		return nil, err
	}
	return runtime, nil
}

func (r *Runtime) bootstrapSessions(ctx context.Context) error {
	r.ensureWorkspaceSessions(ctx, r.Workspace.Snapshot(), true)
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
			LaunchMode:   connection.SSH.LaunchMode,
			TmuxSession:  connection.SSH.TmuxSession,
		}
	}
	return spec, nil
}
