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
  - optional manifest field:
    - `capabilities`
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
