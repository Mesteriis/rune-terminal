package app

import (
	"github.com/Mesteriis/rune-terminal/core/plugins"
)

func (r *Runtime) registerMCPServers() error {
	if r.MCP == nil {
		return nil
	}
	for _, spec := range []plugins.MCPServerSpec{
		{
			ID: "mcp.example",
			Process: plugins.ProcessConfig{
				Command: pluginExecutable(),
				Args:    []string{"plugin-example"},
			},
		},
	} {
		if err := r.MCP.Registry().Register(spec); err != nil {
			return err
		}
	}
	return nil
}

func (r *Runtime) ListMCPServers() []plugins.MCPServerSnapshot {
	if r.MCP == nil {
		return nil
	}
	return r.MCP.Registry().List()
}
