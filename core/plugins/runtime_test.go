package plugins

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestNewRuntimeAppliesDefaults(t *testing.T) {
	t.Parallel()

	runtime := NewRuntime(nil, 0)
	if runtime.DefaultTimeout() != DefaultInvokeTimeout {
		t.Fatalf("expected default timeout %s, got %s", DefaultInvokeTimeout, runtime.DefaultTimeout())
	}
}

func TestInvokeSkeletonReturnsNotImplemented(t *testing.T) {
	t.Parallel()

	runtime := NewRuntime(nil, time.Second)
	_, err := runtime.Invoke(context.Background(), PluginSpec{
		Name: "example",
		Process: ProcessConfig{
			Command: "echo",
		},
	}, InvokeRequest{
		ToolName: "plugin.example",
	})
	if !errors.Is(err, ErrProtocolNotImplemented) {
		t.Fatalf("expected ErrProtocolNotImplemented, got %v", err)
	}
}

func TestInvokeValidatesSpecAndRequest(t *testing.T) {
	t.Parallel()

	runtime := NewRuntime(nil, time.Second)
	_, err := runtime.Invoke(context.Background(), PluginSpec{}, InvokeRequest{})
	if !errors.Is(err, ErrInvalidPluginSpec) {
		t.Fatalf("expected ErrInvalidPluginSpec, got %v", err)
	}
}
