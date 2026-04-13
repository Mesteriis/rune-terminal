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
	mux.HandleFunc("GET /api/v1/workspace", api.handleWorkspace)
	mux.HandleFunc("GET /api/v1/connections", api.handleConnections)
	mux.HandleFunc("PUT /api/v1/connections/active", api.handleSelectConnection)
	mux.HandleFunc("POST /api/v1/connections/ssh", api.handleSaveSSHConnection)
	mux.HandleFunc("POST /api/v1/workspace/focus-widget", api.handleFocusWidget)
	mux.HandleFunc("POST /api/v1/workspace/focus-tab", api.handleFocusTab)
	mux.HandleFunc("POST /api/v1/workspace/tabs", api.handleCreateTerminalTab)
	mux.HandleFunc("PATCH /api/v1/workspace/tabs/{tabID}/rename", api.handleRenameTab)
	mux.HandleFunc("PATCH /api/v1/workspace/tabs/{tabID}/pinned", api.handleSetTabPinned)
	mux.HandleFunc("POST /api/v1/workspace/tabs/move", api.handleMoveTab)
	mux.HandleFunc("DELETE /api/v1/workspace/tabs/{tabID}", api.handleCloseTab)
	mux.HandleFunc("GET /api/v1/tools", api.handleTools)
	mux.HandleFunc("GET /api/v1/policy/trusted-rules", api.handleTrustedRules)
	mux.HandleFunc("GET /api/v1/policy/ignore-rules", api.handleIgnoreRules)
	mux.HandleFunc("GET /api/v1/agent", api.handleAgentCatalog)
	mux.HandleFunc("PUT /api/v1/agent/selection/profile", api.handleSetActiveProfile)
	mux.HandleFunc("PUT /api/v1/agent/selection/role", api.handleSetActiveRole)
	mux.HandleFunc("PUT /api/v1/agent/selection/mode", api.handleSetActiveMode)
	mux.HandleFunc("POST /api/v1/tools/execute", api.handleExecuteTool)
	mux.HandleFunc("GET /api/v1/terminal/{widgetID}", api.handleTerminalSnapshot)
	mux.HandleFunc("POST /api/v1/terminal/{widgetID}/input", api.handleTerminalInput)
	mux.HandleFunc("GET /api/v1/terminal/{widgetID}/stream", api.handleTerminalStream)
	mux.HandleFunc("GET /api/v1/audit", api.handleAudit)
	return api.withCORS(api.withAuth(mux))
}

func Shutdown(ctx context.Context, server *http.Server) error {
	return server.Shutdown(ctx)
}
