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

func (r *Runtime) CountActiveExecutionBlocks() int {
	if r.Execution == nil {
		return 0
	}
	return r.Execution.ActiveCount()
}

func (r *Runtime) FailActiveExecutionBlocks(reason string) (int, error) {
	if r.Execution == nil {
		return 0, nil
	}
	return r.Execution.MarkActiveFailed(reason)
}
