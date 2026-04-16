package app

import (
	"strings"

	"github.com/Mesteriis/rune-terminal/core/execution"
)

func (r *Runtime) ListExecutionBlocks(workspaceID string, limit int) []execution.Block {
	if r.Execution == nil {
		return []execution.Block{}
	}
	return r.Execution.List(strings.TrimSpace(workspaceID), limit)
}

func (r *Runtime) GetExecutionBlock(id string) (execution.Block, bool) {
	if r.Execution == nil {
		return execution.Block{}, false
	}
	return r.Execution.Get(strings.TrimSpace(id))
}
