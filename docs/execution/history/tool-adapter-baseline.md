# Tool Adapter Boundary Baseline

Date: `2026-04-16`

## Current coupling

- Tool definitions in `core/app/tool_terminal.go`, `core/app/tool_workspace.go`, `core/app/tool_connections.go`, and `core/app/tool_policy.go` are constructed as methods on `*app.Runtime`.
- Each tool definition returns `toolruntime.Definition` closures that directly capture runtime internals.
- The captured dependencies are not limited to one narrow adapter surface. They reach into:
  - `r.Workspace`
  - `r.Terminals`
  - `r.Connections`
  - `r.Policy`
  - `r.Executor`
  - `r.RepoRoot`
  - runtime helper methods such as `resolveWidgetID`, `normalizeScopeRef`, `connectionForWidget`, and higher-level workspace/connection actions

## Implicit dependencies

- Terminal tools implicitly depend on:
  - active-widget resolution
  - terminal state/input/interrupt services
- Workspace tools implicitly depend on:
  - tab/widget mutation services
  - terminal session spawn/close behavior through workspace actions
  - repo-root and connection resolution during terminal-tab creation
- Policy tools implicitly depend on:
  - policy storage
  - approval confirmation through the executor
  - scope normalization that falls back to runtime workspace/repo state
- Connection tools implicitly depend on:
  - connection catalog actions
  - connection check/save semantics

## Why externalization is hard today

- Tool handlers do not depend on a narrow contract. They depend on the full runtime object graph.
- The tool registry sees executable closures, not an adapter-backed boundary that could later point to an external execution peer.
- Widget/repo/workspace fallback logic is mixed into runtime helpers instead of being expressed as an execution-facing adapter contract.
- Approval confirmation is available to policy tools by direct access to `r.Executor`, which is another in-process runtime dependency.

## Slice boundary

- This baseline does not define plugin runtime behavior.
- This baseline does not change execution semantics.
- The hardening target is only to introduce an explicit adapter seam so tool handlers stop depending directly on `*app.Runtime`.
