package toolruntime

import (
	"testing"

	"github.com/Mesteriis/rune-terminal/core/plugins"
)

func TestPluginBackedDefinitionMarksToolAsPluginBacked(t *testing.T) {
	t.Parallel()

	base := Definition{Name: "workspace.list_widgets"}
	spec := plugins.PluginSpec{
		Name: "example-plugin",
		Process: plugins.ProcessConfig{
			Command: "/tmp/plugin",
			Args:    []string{"--flag"},
			Env:     []string{"FOO=bar"},
		},
		Capabilities: []string{"plugin:execute"},
	}

	pluginDefinition := PluginBackedDefinition(base, spec)
	if !pluginDefinition.IsPluginBacked() {
		t.Fatalf("expected plugin-backed definition")
	}
	if pluginDefinition.Plugin == nil || pluginDefinition.Plugin.Spec.Name != "example-plugin" {
		t.Fatalf("unexpected plugin spec: %#v", pluginDefinition.Plugin)
	}
	if base.IsPluginBacked() {
		t.Fatalf("expected base definition to remain in-process")
	}
}
