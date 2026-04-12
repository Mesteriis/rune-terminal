package httpapi

import (
	"context"
	"net/http"

	"github.com/avm/rterm/core/app"
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
	mux.HandleFunc("GET /api/v1/tools", api.handleTools)
	mux.HandleFunc("GET /api/v1/agent", api.handleAgentCatalog)
	mux.HandleFunc("PUT /api/v1/agent/selection/profile", api.handleSetActiveProfile)
	mux.HandleFunc("PUT /api/v1/agent/selection/role", api.handleSetActiveRole)
	mux.HandleFunc("PUT /api/v1/agent/selection/mode", api.handleSetActiveMode)
	mux.HandleFunc("POST /api/v1/tools/execute", api.handleExecuteTool)
	mux.HandleFunc("POST /api/v1/terminal/{widgetID}/input", api.handleTerminalInput)
	mux.HandleFunc("GET /api/v1/terminal/{widgetID}/stream", api.handleTerminalStream)
	mux.HandleFunc("GET /api/v1/audit", api.handleAudit)
	return api.withCORS(api.withAuth(mux))
}

func Shutdown(ctx context.Context, server *http.Server) error {
	return server.Shutdown(ctx)
}
