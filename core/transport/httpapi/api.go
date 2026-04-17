package httpapi

import (
	"context"
	"net/http"

	"github.com/Mesteriis/rune-terminal/core/app"
)

type API struct {
	runtime   *app.Runtime
	authToken string
}

func NewHandler(runtime *app.Runtime, authToken string) http.Handler {
	api := &API{runtime: runtime, authToken: authToken}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", api.handleHealth)
	mux.HandleFunc("GET /api/v1/bootstrap", api.handleBootstrap)
	mux.HandleFunc("GET /api/v1/workflow/quick-actions", api.handleQuickActions)
	mux.HandleFunc("GET /api/v1/workspace", api.handleWorkspace)
	mux.HandleFunc("GET /api/v1/workspaces", api.handleListWorkspaces)
	mux.HandleFunc("GET /api/v1/workspaces/themes", api.handleWorkspaceThemes)
	mux.HandleFunc("POST /api/v1/workspaces", api.handleCreateWorkspace)
	mux.HandleFunc("PATCH /api/v1/workspaces/{workspaceID}", api.handleUpdateWorkspaceMetadata)
	mux.HandleFunc("DELETE /api/v1/workspaces/{workspaceID}", api.handleDeleteWorkspace)
	mux.HandleFunc("POST /api/v1/workspaces/{workspaceID}/activate", api.handleActivateWorkspace)
	mux.HandleFunc("GET /api/v1/fs/list", api.handleListFS)
	mux.HandleFunc("GET /api/v1/fs/read", api.handleReadFS)
	mux.HandleFunc("GET /api/v1/connections", api.handleConnections)
	mux.HandleFunc("POST /api/v1/connections/{connectionID}/check", api.handleCheckConnection)
	mux.HandleFunc("PUT /api/v1/connections/active", api.handleSelectConnection)
	mux.HandleFunc("POST /api/v1/connections/ssh", api.handleSaveSSHConnection)
	mux.HandleFunc("GET /api/v1/remote/profiles", api.handleListRemoteProfiles)
	mux.HandleFunc("POST /api/v1/remote/profiles", api.handleSaveRemoteProfile)
	mux.HandleFunc("DELETE /api/v1/remote/profiles/{profileID}", api.handleDeleteRemoteProfile)
	mux.HandleFunc("POST /api/v1/remote/profiles/{profileID}/session", api.handleCreateRemoteSessionFromProfile)
	mux.HandleFunc("GET /api/v1/mcp/servers", api.handleListMCPServers)
	mux.HandleFunc("POST /api/v1/mcp/servers", api.handleRegisterMCPServer)
	mux.HandleFunc("POST /api/v1/mcp/servers/{serverID}/start", api.handleStartMCPServer)
	mux.HandleFunc("POST /api/v1/mcp/servers/{serverID}/stop", api.handleStopMCPServer)
	mux.HandleFunc("POST /api/v1/mcp/servers/{serverID}/restart", api.handleRestartMCPServer)
	mux.HandleFunc("POST /api/v1/mcp/servers/{serverID}/enable", api.handleEnableMCPServer)
	mux.HandleFunc("POST /api/v1/mcp/servers/{serverID}/disable", api.handleDisableMCPServer)
	mux.HandleFunc("POST /api/v1/mcp/invoke", api.handleInvokeMCP)
	mux.HandleFunc("POST /api/v1/workspace/focus-widget", api.handleFocusWidget)
	mux.HandleFunc("POST /api/v1/workspace/focus-tab", api.handleFocusTab)
	mux.HandleFunc("PATCH /api/v1/workspace/layout", api.handleUpdateLayout)
	mux.HandleFunc("POST /api/v1/workspace/layouts/save", api.handleSaveLayout)
	mux.HandleFunc("POST /api/v1/workspace/layouts/switch", api.handleSwitchLayout)
	mux.HandleFunc("POST /api/v1/workspace/tabs", api.handleCreateTerminalTab)
	mux.HandleFunc("POST /api/v1/workspace/widgets/split", api.handleCreateSplitTerminalWidget)
	mux.HandleFunc("POST /api/v1/workspace/widgets/open-directory", api.handleOpenDirectoryInNewBlock)
	mux.HandleFunc("POST /api/v1/workspace/widgets/move-split", api.handleMoveWidgetBySplit)
	mux.HandleFunc("POST /api/v1/workspace/tabs/remote", api.handleCreateRemoteTerminalTab)
	mux.HandleFunc("PATCH /api/v1/workspace/tabs/{tabID}/rename", api.handleRenameTab)
	mux.HandleFunc("PATCH /api/v1/workspace/tabs/{tabID}/pinned", api.handleSetTabPinned)
	mux.HandleFunc("POST /api/v1/workspace/tabs/move", api.handleMoveTab)
	mux.HandleFunc("DELETE /api/v1/workspace/tabs/{tabID}", api.handleCloseTab)
	mux.HandleFunc("GET /api/v1/tools", api.handleTools)
	mux.HandleFunc("GET /api/v1/policy/trusted-rules", api.handleTrustedRules)
	mux.HandleFunc("GET /api/v1/policy/ignore-rules", api.handleIgnoreRules)
	mux.HandleFunc("GET /api/v1/agent", api.handleAgentCatalog)
	mux.HandleFunc("GET /api/v1/agent/conversation", api.handleConversationSnapshot)
	mux.HandleFunc("POST /api/v1/agent/conversation/messages", api.handleSubmitConversationMessage)
	mux.HandleFunc("POST /api/v1/agent/conversation/attachments/references", api.handleCreateAttachmentReference)
	mux.HandleFunc("POST /api/v1/agent/terminal-commands/explain", api.handleExplainTerminalCommand)
	mux.HandleFunc("GET /api/v1/execution/blocks", api.handleListExecutionBlocks)
	mux.HandleFunc("GET /api/v1/execution/blocks/{blockID}", api.handleGetExecutionBlock)
	mux.HandleFunc("PUT /api/v1/agent/selection/profile", api.handleSetActiveProfile)
	mux.HandleFunc("PUT /api/v1/agent/selection/role", api.handleSetActiveRole)
	mux.HandleFunc("PUT /api/v1/agent/selection/mode", api.handleSetActiveMode)
	mux.HandleFunc("POST /api/v1/tools/execute", api.handleExecuteTool)
	mux.HandleFunc("GET /api/v1/terminal/{widgetID}", api.handleTerminalSnapshot)
	mux.HandleFunc("POST /api/v1/terminal/{widgetID}/input", api.handleTerminalInput)
	mux.HandleFunc("POST /api/v1/terminal/{widgetID}/restart", api.handleTerminalRestart)
	mux.HandleFunc("GET /api/v1/terminal/{widgetID}/stream", api.handleTerminalStream)
	mux.HandleFunc("GET /api/v1/audit", api.handleAudit)
	return api.withCORS(api.withAuth(mux))
}

func Shutdown(ctx context.Context, server *http.Server) error {
	return server.Shutdown(ctx)
}
