package app

import (
	"context"

	"github.com/avm/rterm/core/agent"
	"github.com/avm/rterm/core/audit"
	"github.com/avm/rterm/core/config"
	"github.com/avm/rterm/core/connections"
	"github.com/avm/rterm/core/policy"
	"github.com/avm/rterm/core/terminal"
	"github.com/avm/rterm/core/toolruntime"
	"github.com/avm/rterm/core/workspace"
)

type Runtime struct {
	RepoRoot    string
	Paths       config.Paths
	Workspace   *workspace.Service
	Terminals   *terminal.Service
	Connections *connections.Service
	Agent       *agent.Store
	Policy      *policy.Store
	Audit       *audit.Log
	Registry    *toolruntime.Registry
	Executor    *toolruntime.Executor
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

	runtime := &Runtime{
		RepoRoot:    repoRoot,
		Paths:       paths,
		Workspace:   workspace.NewService(workspace.BootstrapDefault()),
		Terminals:   terminal.NewService(terminal.DefaultLauncher()),
		Connections: connectionStore,
		Agent:       agentStore,
		Policy:      policyStore,
		Audit:       auditLog,
		Registry:    toolruntime.NewRegistry(),
	}
	runtime.Executor = toolruntime.NewExecutor(runtime.Registry, runtime.Policy, runtime.Audit, runtime.Agent)

	if err := runtime.bootstrapSessions(context.Background()); err != nil {
		return nil, err
	}
	if err := runtime.registerTools(); err != nil {
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
			return err
		}
		if _, err := r.Terminals.StartSession(ctx, terminal.LaunchOptions{
			WidgetID:   widget.ID,
			WorkingDir: r.RepoRoot,
			Connection: connection,
		}); err != nil {
			return err
		}
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
