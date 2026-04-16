package toolruntime

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/Mesteriis/rune-terminal/core/plugins"
)

type PluginInvoker interface {
	Invoke(context.Context, plugins.PluginSpec, plugins.InvokeRequest) (plugins.InvokeResult, error)
}

func (e *Executor) executePrepared(ctx context.Context, prepared *preparedExecution) (any, error) {
	if !prepared.definition.IsPluginBacked() {
		return prepared.definition.Execute(ctx, prepared.execContext, prepared.input)
	}
	if e.pluginInvoker == nil {
		return nil, InternalError("plugin runtime is not configured", nil)
	}

	rawInput, err := json.Marshal(prepared.input)
	if err != nil {
		return nil, InternalError("failed to encode plugin input", err)
	}

	result, err := e.pluginInvoker.Invoke(ctx, prepared.definition.Plugin.Spec, plugins.InvokeRequest{
		ToolName: prepared.definition.Name,
		Input:    rawInput,
		Context: plugins.RequestContext{
			WorkspaceID: prepared.execContext.WorkspaceID,
			WidgetID:    prepared.execContext.ActiveWidgetID,
			RepoRoot:    prepared.execContext.RepoRoot,
			RoleID:      prepared.execContext.RoleID,
			ModeID:      prepared.execContext.ModeID,
		},
	})
	if err != nil {
		return nil, normalizePluginError(err)
	}
	if len(result.Output) == 0 {
		return map[string]any{}, nil
	}

	var output any
	if err := json.Unmarshal(result.Output, &output); err != nil {
		return nil, InternalError("plugin returned invalid output", err)
	}
	return output, nil
}

func normalizePluginError(err error) error {
	var executionErr *plugins.ExecutionError
	if errors.As(err, &executionErr) {
		switch executionErr.Code {
		case "invalid_input":
			return InvalidInputError(executionErr.Message)
		case "not_found":
			return NotFoundError(executionErr.Message)
		default:
			return InternalError(executionErr.Message, err)
		}
	}
	if errors.Is(err, plugins.ErrPluginTimeout) {
		return InternalError("plugin execution timed out", err)
	}
	if errors.Is(err, plugins.ErrPluginProcessCrashed) {
		return InternalError("plugin process crashed", err)
	}
	if errors.Is(err, plugins.ErrMalformedPluginOutput) {
		return InternalError("plugin returned malformed response", err)
	}
	if errors.Is(err, plugins.ErrProcessSpawnFailed) {
		return InternalError("failed to launch plugin process", err)
	}
	return InternalError("plugin execution failed", err)
}
