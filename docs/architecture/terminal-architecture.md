# rune-terminal Terminal Architecture

## Position

The terminal subsystem is a runtime service, not a renderer concern.

## Model

- each terminal widget maps to one `TerminalSession`
- one terminal widget may have only one active session at a time
- sessions are PTY-backed on macOS and Linux
- the terminal service stores buffered output chunks and current runtime state
- frontend rendering is an adapter over the stream

## Lifecycle

1. Workspace bootstrap asks the terminal service to start sessions for terminal widgets.
2. Concurrent start calls for the same widget coalesce onto one launch attempt.
3. The terminal launcher starts the user shell under a PTY.
4. Output is copied into:
   - an in-memory ring buffer
   - live subscribers
5. UI sends input via `term.send_input`.
6. Interrupts travel via explicit signal APIs.
7. Exit status is captured in terminal session state and active stream subscribers are closed.

## Why Not Let The Frontend Own Terminal State

The old TideTerm architecture let significant runtime semantics leak into the frontend and RPC layers. The rewrite keeps terminal truth in Go so that:

- AI tools and UI read the same state
- audit and policy can reason over terminal actions
- future remote session support reuses the same runtime contract

## Remote Future

The initial MVP is local-shell focused, but the service boundary is intentionally compatible with future local and SSH launchers.
