package toolruntime

import "github.com/Mesteriis/rune-terminal/core/plugins"

func PluginBackedDefinition(definition Definition, spec plugins.PluginSpec) Definition {
	clone := definition
	clone.Plugin = &PluginBinding{
		Spec: clonePluginSpec(spec),
	}
	return clone
}

func (d Definition) IsPluginBacked() bool {
	return d.Plugin != nil
}

func clonePluginSpec(spec plugins.PluginSpec) plugins.PluginSpec {
	clone := spec
	clone.Process.Args = append([]string(nil), spec.Process.Args...)
	clone.Process.Env = append([]string(nil), spec.Process.Env...)
	clone.Capabilities = append([]string(nil), spec.Capabilities...)
	return clone
}
