package plugins

import (
	"context"
	"fmt"
	"strings"
	"time"
)

type Runtime struct {
	spawner        ProcessSpawner
	defaultTimeout time.Duration
}

func NewRuntime(spawner ProcessSpawner, defaultTimeout time.Duration) *Runtime {
	if spawner == nil {
		spawner = OSProcessSpawner{}
	}
	if defaultTimeout <= 0 {
		defaultTimeout = DefaultInvokeTimeout
	}
	return &Runtime{
		spawner:        spawner,
		defaultTimeout: defaultTimeout,
	}
}

func (r *Runtime) DefaultTimeout() time.Duration {
	return r.defaultTimeout
}

func (r *Runtime) Invoke(ctx context.Context, spec PluginSpec, request InvokeRequest) (InvokeResult, error) {
	if err := validateInvocation(spec, request); err != nil {
		return InvokeResult{}, err
	}
	return InvokeResult{}, ErrProtocolNotImplemented
}

func (r *Runtime) invocationTimeout(spec PluginSpec) time.Duration {
	if spec.Timeout > 0 {
		return spec.Timeout
	}
	return r.defaultTimeout
}

func validateInvocation(spec PluginSpec, request InvokeRequest) error {
	if strings.TrimSpace(spec.Name) == "" {
		return fmt.Errorf("%w: plugin name is required", ErrInvalidPluginSpec)
	}
	if strings.TrimSpace(spec.Process.Command) == "" {
		return fmt.Errorf("%w: plugin command is required", ErrInvalidPluginSpec)
	}
	if strings.TrimSpace(request.ToolName) == "" {
		return fmt.Errorf("%w: tool name is required", ErrInvalidPluginSpec)
	}
	return nil
}
