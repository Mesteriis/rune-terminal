package toolruntime

import (
	"errors"
	"slices"
	"sync"
)

type Registry struct {
	mu    sync.RWMutex
	tools map[string]Definition
}

func NewRegistry() *Registry {
	return &Registry{tools: make(map[string]Definition)}
}

func (r *Registry) Register(tool Definition) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if tool.Name == "" {
		return errors.New("tool name is required")
	}
	if _, exists := r.tools[tool.Name]; exists {
		return errors.New("tool already registered")
	}
	r.tools[tool.Name] = tool
	return nil
}

func (r *Registry) Get(name string) (Definition, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	tool, ok := r.tools[name]
	return tool, ok
}

func (r *Registry) List() []ToolInfo {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var tools []ToolInfo
	for _, tool := range r.tools {
		tools = append(tools, ToolInfo{
			Name:         tool.Name,
			Description:  tool.Description,
			InputSchema:  slices.Clone(tool.InputSchema),
			OutputSchema: slices.Clone(tool.OutputSchema),
			Metadata:     tool.Metadata,
		})
	}
	slices.SortFunc(tools, func(left ToolInfo, right ToolInfo) int {
		if left.Name < right.Name {
			return -1
		}
		if left.Name > right.Name {
			return 1
		}
		return 0
	})
	return tools
}
