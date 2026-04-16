# Plugin Manifest and Capability Baseline

Date: `2026-04-16`

## 1. What is currently implicit

- Plugin identity is effectively inferred from handshake metadata (`plugin.name`, `plugin.version`) and static `PluginSpec.Name` in core registration.
- Plugin capabilities are loosely represented by string arrays in both `PluginSpec.Capabilities` and handshake metadata.
- Tool exposure is currently implicit in core-owned registration (`plugin.example_echo`) plus runtime request `tool_name`; plugin does not explicitly declare a tool catalog in handshake.

## 2. Missing metadata

- No explicit plugin manifest shape with required fields (`plugin_id`, `plugin_version`, `protocol_version`, `exposed_tools`).
- No explicit declaration from plugin of which tool names it serves.
- No explicit runtime check that the requested tool is actually exposed by the plugin declaration.
- No typed capability contract beyond generic string slices.

## 3. Current core assumptions without explicit declaration

- Core assumes `PluginSpec.Name` and handshake `plugin.name` are semantically aligned enough without strict identity matching.
- Core assumes the plugin process behind a tool binding will accept the requested tool name.
- Core assumes plugin capability strings are informational and not contract-enforced.
- Core assumes protocol compatibility from `protocol_version` matching only, without explicit manifest-level contract semantics.

## 4. Strict slice boundary for this hardening batch

- no plugin registry implementation
- no plugin installation/update UX
- no plugin discovery UI
- no sandbox/isolation engine work
