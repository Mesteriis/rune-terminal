package app

import "testing"

func TestPluginExampleEchoToolIsRegisteredAsPluginBacked(t *testing.T) {
	t.Parallel()

	runtime := &Runtime{}
	tool := runtime.pluginExampleEchoTool()

	if tool.Name != "plugin.example_echo" {
		t.Fatalf("unexpected tool name: %s", tool.Name)
	}
	if !tool.IsPluginBacked() {
		t.Fatalf("expected plugin-backed definition")
	}
	if tool.Plugin == nil || tool.Plugin.Spec.Name != "example.side_process" {
		t.Fatalf("unexpected plugin binding: %#v", tool.Plugin)
	}
	if len(tool.Plugin.Spec.Process.Args) != 1 || tool.Plugin.Spec.Process.Args[0] != "plugin-example" {
		t.Fatalf("unexpected plugin process args: %#v", tool.Plugin.Spec.Process.Args)
	}
}
