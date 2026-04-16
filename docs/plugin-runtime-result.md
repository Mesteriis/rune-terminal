# Plugin Runtime Result

Date: `2026-04-16`

## 1. What was implemented

- Added `core/plugins/**` runtime with process spawning, protocol exchange, timeout handling, and malformed/crash failure handling.
- Added plugin-backed tool adapter support in `core/toolruntime` with executor routing through plugin invoker.
- Wired app runtime to provide plugin invoker and registered one plugin-backed tool: `plugin.example_echo`.
- Added a minimal side-process example plugin in `plugins/example/**`.
- Added `rterm-core plugin-example` subcommand so the plugin is executable as a real side process from the core binary.

## 2. Protocol in use

- Transport: plugin `stdin`/`stdout`
- Framing: line-delimited JSON (one message per line)
- Handshake: `PluginHandshakeRequest` -> `PluginHandshakeResponse`
- Execution: `PluginRequest` -> `PluginResponse`
- Version: `rterm.plugin.v1`
- Timeout: core-owned invocation timeout; timeout is treated as execution failure

## 3. What the example plugin proves

- Core can launch a side-process plugin and complete handshake + request/response exchange.
- Plugin-backed tool execution works through existing `/api/v1/tools/execute` runtime path.
- Plugin output is returned through normal execute response handling and recorded in core audit.

## 4. Intentionally unimplemented

- Plugin registry/discovery UI
- Plugin installation/update UX
- Hot reload lifecycle
- Sandbox/isolation enforcement beyond process boundary
- Plugin persistence/catalog management beyond static registration

## 5. Current risks and limits

- Protocol is single-request-per-process; no pooling/multiplexing lifecycle yet.
- Plugin error taxonomy is minimal and mostly normalized into existing tool runtime error codes.
- Example plugin is static and local; there is no dynamic plugin discovery/configuration model yet.
