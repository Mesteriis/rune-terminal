# Plugin Runtime Baseline

Date: `2026-04-16`

## Runtime location

- Process runtime implementation: `core/plugins/**`
- Tool execution integration point: `core/toolruntime/**`
- Runtime wiring and tool registration: `core/app/**`

## Core invocation model

1. Core tool runtime resolves tool, decodes input, and builds operation plan.
2. Core policy/approval stages run before any plugin process execution.
3. For plugin-backed tools, core invokes a plugin side-process through an explicit runtime entrypoint.
4. Core validates plugin response and maps it into normal tool runtime output.
5. Core appends audit from core-owned execution truth.

## Explicitly out of scope in this batch

- plugin registry/discovery UI
- plugin installation UX
- plugin hot reload
- plugin sandbox implementation

## Minimal end-to-end target

- one plugin process launched by core
- one explicit request/response protocol between core and plugin
- one plugin-backed tool execution path through existing tool runtime flow
