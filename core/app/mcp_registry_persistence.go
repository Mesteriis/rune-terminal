package app

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/plugins"
	"github.com/Mesteriis/rune-terminal/internal/atomicfile"
)

const mcpRegistryVersion = 1

type persistedMCPRegistry struct {
	Version int                  `json:"version"`
	Servers []persistedMCPServer `json:"servers,omitempty"`
}

type persistedMCPServer struct {
	ID       string            `json:"id"`
	Type     string            `json:"type"`
	Endpoint string            `json:"endpoint"`
	Headers  map[string]string `json:"headers,omitempty"`
	Enabled  bool              `json:"enabled"`
}

func (r *Runtime) loadPersistedMCPRegistry() error {
	path := strings.TrimSpace(r.Paths.MCPRegistryFile)
	if path == "" || r.MCP == nil {
		return nil
	}
	servers, err := loadMCPRegistryFile(path)
	if err != nil {
		return err
	}
	for _, server := range servers {
		switch plugins.MCPServerType(server.Type) {
		case plugins.MCPServerTypeRemote:
			spec := plugins.MCPServerSpec{
				ID:   server.ID,
				Type: plugins.MCPServerTypeRemote,
				Remote: &plugins.MCPRemoteConfig{
					Endpoint: server.Endpoint,
					Headers:  server.Headers,
				},
			}
			if err := r.MCP.Registry().Register(spec); err != nil && !errors.Is(err, plugins.ErrMCPServerRegistered) {
				return err
			}
			if !server.Enabled {
				if err := r.MCP.SetEnabled(server.ID, false); err != nil {
					return err
				}
			}
		case plugins.MCPServerTypeProcess:
			spec, err := r.MCP.Registry().Spec(server.ID)
			if err != nil || spec.Type != plugins.MCPServerTypeProcess {
				continue
			}
			if err := r.MCP.SetEnabled(server.ID, server.Enabled); err != nil {
				return err
			}
		}
	}
	return nil
}

func (r *Runtime) persistMCPRegistry() error {
	path := strings.TrimSpace(r.Paths.MCPRegistryFile)
	if path == "" || r.MCP == nil {
		return nil
	}

	servers := make([]persistedMCPServer, 0, 8)
	for _, server := range r.MCP.Registry().List() {
		spec, err := r.MCP.Registry().Spec(server.ID)
		if err != nil {
			continue
		}
		switch server.Type {
		case plugins.MCPServerTypeRemote:
			if spec.Remote == nil {
				continue
			}
			headers := make(map[string]string, len(spec.Remote.Headers))
			for key, value := range spec.Remote.Headers {
				headers[key] = value
			}
			servers = append(servers, persistedMCPServer{
				ID:       spec.ID,
				Type:     string(plugins.MCPServerTypeRemote),
				Endpoint: spec.Remote.Endpoint,
				Headers:  headers,
				Enabled:  server.Enabled,
			})
		case plugins.MCPServerTypeProcess:
			servers = append(servers, persistedMCPServer{
				ID:      spec.ID,
				Type:    string(plugins.MCPServerTypeProcess),
				Enabled: server.Enabled,
			})
		}
	}
	return saveMCPRegistryFile(path, servers)
}

func loadMCPRegistryFile(path string) ([]persistedMCPServer, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, nil
		}
		return nil, err
	}
	if len(data) == 0 {
		return nil, nil
	}
	var persisted persistedMCPRegistry
	if err := json.Unmarshal(data, &persisted); err != nil {
		return nil, err
	}
	servers := make([]persistedMCPServer, 0, len(persisted.Servers))
	for _, server := range persisted.Servers {
		id := strings.TrimSpace(server.ID)
		serverType := strings.TrimSpace(server.Type)
		if id == "" {
			continue
		}
		switch serverType {
		case string(plugins.MCPServerTypeRemote):
			endpoint := strings.TrimSpace(server.Endpoint)
			if endpoint == "" {
				continue
			}
			headers := make(map[string]string, len(server.Headers))
			for key, value := range server.Headers {
				headers[key] = value
			}
			servers = append(servers, persistedMCPServer{
				ID:       id,
				Type:     serverType,
				Endpoint: endpoint,
				Headers:  headers,
				Enabled:  server.Enabled,
			})
		case string(plugins.MCPServerTypeProcess):
			servers = append(servers, persistedMCPServer{
				ID:      id,
				Type:    serverType,
				Enabled: server.Enabled,
			})
		}
	}
	return servers, nil
}

func saveMCPRegistryFile(path string, servers []persistedMCPServer) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	payload, err := json.MarshalIndent(persistedMCPRegistry{
		Version: mcpRegistryVersion,
		Servers: servers,
	}, "", "  ")
	if err != nil {
		return err
	}
	return atomicfile.WriteFile(path, payload, 0o600)
}
