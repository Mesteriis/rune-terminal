# Plugin Runtime Protocol

Date: `2026-04-16`

## Transport

- Core launches plugin as a side process.
- Core writes protocol messages to plugin `stdin`.
- Core reads protocol messages from plugin `stdout`.
- Messages are JSON objects.

## Framing

- Framing is line-delimited JSON (one complete JSON object per line).
- Core expects exactly one handshake response line after startup.
- Core then sends one execute request line and expects one execute response line.
- Anything that cannot be decoded as one full JSON object is malformed protocol output.

## Message contract

- Handshake request: `PluginHandshakeRequest`
- Handshake response: `PluginHandshakeResponse` including explicit `manifest`
  - required manifest fields:
    - `plugin_id`
    - `plugin_version`
    - `protocol_version`
    - `exposed_tools`
  - capability declaration:
    - `capabilities`
      - required when the core-bound `PluginSpec` grants plugin capabilities
      - each value is a capability/resource the plugin explicitly requests
      - every requested value must exist in the core-owned allow-list for that
        plugin binding
      - empty, whitespace-padded and duplicate values are rejected
- Execute request: `PluginRequest`
- Execute response: `PluginResponse`
- Error payload: `PluginError`

## Timeout rules

- Invocation timeout is owned by core (plugin-specific timeout or runtime default).
- Timeout is a hard execution failure.
- Timeout never maps to implicit success.

## Malformed/crash behavior

- Plugin exit before a valid response is treated as execution failure.
- Malformed handshake or response payload is treated as execution failure.
- Core does not silently fallback to success when protocol exchange is invalid.

## Plugin error taxonomy

Core classifies plugin-runtime failures with explicit codes:

- `launch_failed`
- `handshake_failed`
- `timeout`
- `crashed`
- `malformed_response`
- `tool_not_exposed`
- `protocol_version_mismatch`
- `capability_not_declared`
- `capability_not_allowed`

Additional contract checks tied to this taxonomy:

- handshake `manifest.protocol_version` must match requested protocol
- requested runtime tool must exist in `manifest.exposed_tools`
- if `PluginSpec.Capabilities` is non-empty, handshake `manifest.capabilities`
  must explicitly declare the plugin's requested capabilities
- handshake `manifest.capabilities` must be a subset of the core-owned
  `PluginSpec.Capabilities` allow-list; the plugin never self-grants power by
  naming a capability
