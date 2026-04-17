# Current Behavior

This document records the runtime invariants that are true in the repository today.
It is intentionally operational, not narrative.

## Workspace and tab contract

- The workspace now owns both `tabs` and `widgets`.
- There is exactly one active tab and one active widget.
- Tabs can now contain multiple widgets via backend-owned `window_layout` trees (`leaf` / `split`).
- Focusing a tab synchronizes the active widget to the first visible leaf in that tab's window layout.
- Focusing a widget also synchronizes the active tab if that widget belongs to a known tab.
- Tabs are the shell-level navigation unit.
- Widgets remain the secondary inventory used by the right-side dock and terminal/runtime binding.
- The top-left workspace switcher is a TideTerm-shaped shell popover in the active compat shell:
  - it renders the full workspace list
  - it keeps the save/create action split from TideTerm
  - it supports inline workspace editing with theme metadata from the workspace services
- The right-side widget dock now uses shell-level flyout controls for runtime and settings entry points instead of acting as a primary content column.
- The widget dock settings flyout now deep-links into a user-facing shell settings surface with `Overview`, `Trusted tools`, `Secret shield`, and `Help` views.
- The widget dock launcher flyout now acts as the searchable shell-level entry surface for:
  - opening a new terminal tab
  - returning to the AI panel
  - opening files, runtime, audit, MCP, apps, and settings/help surfaces
  - quickly focusing known widgets in the current workspace
- Launcher discoverability in the active compat shell now lives inside that right-utility flyout rather than a separate top-level panel.
- The compat shell right-utility rail now enforces a single active flyout:
  - opening launcher/files/tools/audit/apps/settings replaces the previous flyout instead of stacking overlays
  - launcher-triggered navigation closes the previous flyout before opening the next surface
- The right-side utility rail now includes a minimal `Files` panel for workspace-root-bounded navigation:
  - backend path source of truth: `GET /api/v1/fs/list?path=...`
  - directory traversal is explicit (click folder), with no recursive indexing/caching
  - file selection reveals the absolute path and can request bounded text preview from backend truth (`GET /api/v1/fs/read?path=...`)
  - text preview is bounded (`max_bytes`, clamped server-side) and non-text/binary content is exposed as metadata-only preview-unavailable state
  - filesystem routes enforce workspace-root boundaries and reject outside-root traversal attempts
- File-to-AI context bridging now reuses the existing attachment reference contract from the files panel:
  - attachment references are created through `POST /api/v1/agent/conversation/attachments/references`
  - selected file context is user-driven and explicit (`Attach Selected File To AI Context`)
  - file selection alone does not auto-inject context into conversation payloads
- Files panel now also exposes explicit handoff helpers for selected paths:
  - `Use Selected Path In AI Prompt`
  - `Use Selected Path In /run Prompt`
  - both actions are explicit operator clicks and do not auto-send or auto-execute
- Files panel entries are also draggable into matching terminal widgets, where the terminal inserts the path into input without auto-running it.
- Terminal context menus now expose `Open Current Directory in New Block` on the active compat path when shell cwd metadata is known.
- Opening the current directory from a compat terminal creates a backend-owned `files` widget split to the right of the source terminal:
  - local targets browse the selected directory path directly, including paths outside the workspace root
  - remote targets preserve the connection ID and path in the new block, but the active compat files view remains read-only metadata for remote directories
  - the action does not execute shell commands implicitly
- Widgets can now be bound to a specific connection ID.
- Widget creation in an active tab supports explicit split-side insertion (`left`, `right`, `top`, `bottom`) against a target widget.
- Widget drag/drop split-move is explicit and backend-backed:
  - `POST /api/v1/workspace/widgets/move-split`
  - side selection is explicit (`left`, `right`, `top`, `bottom`, `outer-left`, `outer-right`, `outer-top`, `outer-bottom`)
  - center drop is explicit swap semantics (`center`)
  - empty direction is rejected (no hidden default for move path)
- Tab window layout metadata is persisted/restored as part of workspace snapshot truth.
- Workspace snapshot now carries explicit layout composition truth:
  - active layout (`layout`)
  - saved layout presets (`layouts`)
  - active preset identity (`active_layout_id`)
- Layout composition remains minimal and operator-driven:
  - mode (`split`, `focus`)
  - active surfaces with named regions (`main`, `sidebar`, `utility`)
  - active focus surface
- Layout controls are exposed in the settings flyout:
  - toggle visible surfaces (`AI`, `Tools`, `Audit`, `MCP`)
  - switch mode (`split` / `focus`)
  - choose active focus surface
  - save current layout
  - switch between saved layouts
- Layout updates do not mutate active tab/widget session identity.
- New terminal tabs default to the currently selected connection unless a specific connection is supplied at creation time.
- Runtime utilities and audit remain secondary shell surfaces reachable from the dock and the AI-panel overflow menu.
- Tools panel now renders explicit active-context summary and explicit input helpers:
  - `Use Selected File Path` when the chosen tool schema fits `path`/`paths`
  - `Use Active Widget` when the chosen tool schema fits `widget_id`
  - these actions only patch the visible input JSON; execution still requires explicit `Execute`
  - MCP invoke now also has an explicit `Use Normalized MCP Result In AI` action; this inserts bounded MCP context into AI input only on explicit user click
- New terminal tabs can be created at runtime.
- Closing a tab tears down its terminal session and removes the associated widget from the workspace snapshot.
- The last remaining tab cannot be closed in the current implementation.
- Tabs can be renamed inline from the top strip.
- Tabs can be pinned and unpinned from the top strip.
- Pinned tabs render before regular tabs while preserving creation order inside each group.
- Tabs can be reordered by dragging within their current pinned or regular group.
- Cross-group drag between pinned and regular tabs is rejected in the current implementation.
- Tabs expose a context menu with pin/unpin, rename, and close actions.
- Shell-primary tab actions now use direct workspace management endpoints instead of `POST /api/v1/tools/execute`.
- Operator and debug surfaces can still call the workspace tools through the tool runtime, where policy and audit remain visible.
- The tool catalog now includes one plugin-backed sample tool (`plugin.example_echo`) executed through a side-process protocol while preserving core-owned approval and audit flow.
- Plugin handshake now carries an explicit manifest contract (`plugin_id`, `plugin_version`, `protocol_version`, `exposed_tools`) and core rejects runtime execution if the requested tool is not declared in `exposed_tools`.
- Plugin runtime failures are normalized by core into explicit taxonomy (`launch_failed`, `handshake_failed`, `timeout`, `crashed`, `malformed_response`, `tool_not_exposed`, `protocol_version_mismatch`) and surfaced through tool execution with runtime error code `plugin_failure`.
- MCP servers are now modeled as managed runtime processes with explicit lifecycle states (`stopped`, `starting`, `active`, `idle`, `stopped_auto`) tracked by an in-memory runtime registry.
- MCP server registration now has an explicit API entrypoint:
  - `POST /api/v1/mcp/servers` with minimal payload (`id`, `type`, `endpoint`, optional `headers`)
  - current release scope supports `type: "remote"` registration only
  - registration does not auto-start the server; newly added entries appear as `stopped`
- MCP runtime activation is controlled only through explicit API actions (`start`, `stop`, `restart`, `enable`, `disable`) or explicit on-demand invoke requests; core startup does not auto-load or auto-spawn MCP servers.
- MCP idle servers are auto-stopped after runtime-owned timeout checks, and in-flight MCP invocations are protected from stop/restart interruption.
- MCP invoke responses do not enter agent context automatically.
- MCP invoke output is normalized to a fixed internal schema (`mcp.normalized.v1`) before leaving backend runtime paths.
- normalization enforces bounded structure and size (max payload bytes, max fields/items, max string length, max depth).
- context payloads are only produced when explicitly requested and remain bounded.

## Session lifecycle contract

- Each terminal widget owns at most one active session.
- `terminal.StartSession(widget_id)` is idempotent for an already-running widget session.
- Concurrent `StartSession` calls for the same widget coalesce onto a single launch attempt.
- A second `StartSession` must not spawn a second process for the same widget.
- Session IDs are currently equal to widget IDs in the MVP.
- Sessions are now connection-aware.
- Local sessions use the local shell launcher.
- SSH sessions launch the system `ssh` binary inside the PTY using the saved connection profile.
- The terminal process lifetime is detached from the HTTP request that triggered the launch.
- Closing or completing the create-tab request must not terminate a running local or SSH shell.
- The frontend now hydrates terminal content from a JSON snapshot before opening the SSE stream, so a newly mounted terminal starts with buffered scrollback instead of only new output.
- Terminal SSE attach now snapshots and subscribes atomically in the backend stream path, so buffered replay and live follow do not drop chunks in the handoff gap.
- Terminal cwd metadata from OSC 7 is mirrored into the compat terminal store, so terminal-scoped actions can open the current directory from the active widget state.
- The compat terminal now follows TideTerm keyboard scroll semantics for scrollback navigation:
  - `Shift+End` jumps to the latest output
  - `Shift+Home` jumps to the start of scrollback
  - `Shift+PageDown` / `Shift+PageUp` scroll by pages
  - macOS also supports `Cmd+End` / `Cmd+Home` for bottom/top navigation
- Terminal drag/drop path insertion now covers both native local file drops and in-app `FILE_ITEM` drops when the dragged file target matches the terminal connection.
- Terminal output is written in bounded frontend batches so large output bursts do not block the UI thread as one giant write.
- Terminal keyboard copy/paste now follows TideTerm shortcut semantics on the active compat path:
  - `Ctrl+Shift+C` copies the terminal selection when a selection exists
  - `Ctrl+Shift+V` pastes clipboard content into the active PTY input path
  - `Ctrl+V` also pastes when `app:ctrlvpaste` is enabled; default remains Windows-only
- On startup, the runtime eagerly boots sessions for terminal widgets in the default workspace.
- When a process exits, terminal state moves to `exited` or `failed`, input/interrupt are disabled, and active stream subscribers are closed.

## Connection catalog contract

- The runtime owns a connection catalog separate from the workspace snapshot.
- The catalog always includes a built-in `local` connection.
- Saved SSH profiles are persisted in the runtime state directory and surfaced alongside the built-in local target.
- A saved connection profile is not the same thing as an active default target.
- The catalog stores one active connection ID that acts as the default target for new terminal tabs.
- Selecting an active connection changes the default target for future tabs. It does not migrate already-running sessions.
- Selecting an active connection does not imply that the target has passed preflight checks or that any remote session is live.
- Widgets keep their own `connection_id`, so tabs and sessions remain explicitly bound after creation.
- Connection selection and profile creation are exposed through dedicated management routes and mirrored in the shell connections panel.
- Each connection snapshot now includes:
  - `status`: catalog-level profile state such as `ready` or `configured`
  - `runtime.check_status`: last preflight result (`unchecked`, `passed`, `failed`)
  - `runtime.launch_status`: last launch attempt result (`idle`, `succeeded`, `failed`)
  - `usability`: shell-facing summary (`available`, `attention`, `unknown`)
- `runtime.check_status` reflects the last explicit or save-time preflight check. It is not a live remote reachability probe.
- `runtime.launch_status` reflects only the last shell/runtime launch attempt that reported back into the connection service.
- A connection can keep `runtime.check_status:"failed"` and still record `runtime.launch_status:"succeeded"` if the saved profile has a local validation issue but the system SSH environment still allows a shell to start.
- The shell must present preflight warnings and launch results separately instead of collapsing them into one “connected” flag.
- Current SSH status is intentionally narrow: a saved SSH profile is not treated as a long-lived connected controller.
- There is no persistent live remote connection object in the runtime yet.
- The shell connections panel is lifecycle-oriented:
  - it shows the saved profile
  - it shows whether the profile is the default target for new tabs
  - it shows the last preflight outcome
  - it shows the last launch outcome
  - it shows whether a launch succeeded despite a preflight warning
  - it allows `Check`, `Use for new tabs`, and `Open shell`

## Output subscription contract

- Terminal output subscribers are per-session fanout endpoints.
- Unsubscribe is idempotent.
- Unsubscribe closes the subscriber channel after removing it from the session registry.
- Output delivery uses subscriber objects with internal close/deliver synchronization to avoid `send on closed channel`.
- A closed subscriber may still appear in an old snapshot of the subscriber list, but delivery to it is a no-op.

## Transport auth and origin contract

- `GET /healthz` is intentionally public.
- All other HTTP API routes require bearer-token auth unless a route explicitly opts into a narrower alternative.
- If the Go core starts without `RTERM_AUTH_TOKEN`, protected routes fail explicitly with `503 auth_not_configured`; auth does not silently become optional.
- Query-token auth is currently limited to terminal SSE stream routes only.
- CORS is not wildcard:
  - loopback browser origins (`localhost`, `127.0.0.1`, `::1`) are allowed for the dev/browser path
  - Tauri runtime origins (`tauri://localhost`, `http://tauri.localhost`, `https://tauri.localhost`) are allowed for the desktop path
  - other origins do not receive cross-origin access

## Approval lifecycle contract

- Approval requests are created only when policy evaluation requires confirmation.
- `safety.confirm` consumes the pending approval ID and returns a short-lived approval token.
- Pending approval IDs are single-use.
- Approval tokens are single-use.
- Approval tokens are bound to the approved execution intent:
  - `tool_name`
  - normalized decoded tool input
  - normalized execution context (`workspace_id`, `repo_root`, `active_widget_id`)
- A consumed approval token cannot be replayed for a second execution.
- Retrying with a changed input or execution context is rejected explicitly with `approval_mismatch`.
- A mismatched retry does not consume the token for the original approved intent.
- Reusing a consumed approval token causes the execution to fall back to normal policy evaluation, which may produce a new approval requirement.

## Trusted rule behavior

- Trusted rules are allowlist-style matches scoped to `global`, `workspace`, or `repo`.
- A matching trusted rule can auto-approve dangerous operations.
- Trusted rules do not auto-approve destructive operations.
- Trusted auto-approve can be disabled by the active role/mode/profile overlay.
- Trusted rules do not override hard denials caused by missing capabilities.
- The shell settings surface presents trusted rules as a user-facing list of repeat-approved tools rather than only a raw operator form.

## Ignore rule behavior

- Ignore rules protect sensitive paths and filename patterns.
- Default secret protection modes are:
  - `.env`, `.env.*`, `secrets.*` => `metadata-only`
  - `*.pem`, `*.key`, `*.p12`, `id_rsa`, `id_ed25519` => `deny`
- `metadata-only` marks the match in the decision but does not block execution.
- `redact` is reserved for paths that may be referenced but must have contents masked by higher-level tooling.
- `deny` is a hard sensitive-path boundary unless explicit approval is supplied.
- The shell settings surface presents ignore rules as a “secret shield” list with `deny`, `metadata-only`, and `redact` modes exposed directly in the UI.

## Allowed roots semantics

- Allowed roots define the filesystem boundary for operations that declare `RequiresAllowedRoots`.
- Paths inside an allowed root pass that stage.
- Paths outside allowed roots require approval.
- Approval makes the outside-root access confirmable, not ambiently trusted.

## Policy precedence

The current pipeline is:

1. capability checks
2. allowed roots
3. ignore rules
4. trusted rules
5. approval tier

Practical consequences:

- Missing capabilities are hard denials.
- Outside-root access is confirmable if approval is allowed for that operation.
- `deny` ignore rules take precedence over trusted rules when no approval is present.
- Trusted rules can suppress approval only after capability, allowed-root, and ignore stages have passed.

## Hard boundary vs confirmable boundary

Hard boundaries:

- missing required capabilities
- unsupported or invalid tool input
- nonexistent widget/rule/profile/role/mode IDs

Confirmable boundaries:

- approval-tier requirements for dangerous/destructive actions
- operations outside allowed roots
- `deny` ignore rules

## Temporary MVP compromises

- The active terminal stream path now uses `fetch` streaming with `Authorization: Bearer <token>`.
- Terminal stream query-token auth remains only as a constrained fallback for consumers that cannot send auth headers; it is no longer the normal active shell path.
- Session IDs currently equal widget IDs instead of using a separate durable session identity layer.
- The desktop shell launches the Go core as a sidecar process and discovers it via a ready file; a richer process supervisor does not exist yet.
- Frontend runtime is now explicitly Tauri-first:
  - active shell runtime uses preload bridge + standard browser fetch path
  - non-Tauri runtime expects `VITE_RTERM_API_BASE` as the explicit API base contract
  - legacy no-preload browser compat bootstrap remains explicit in `wave.ts`
  - legacy runtime base fallbacks (`WAVE_SERVER_WEB_ENDPOINT` / `window.location.origin`) are disabled by default and require explicit opt-in `VITE_RTERM_ENABLE_LEGACY_RUNTIME_FALLBACK=1`
  - legacy Electron net fetch fallback is opt-in only via `RTERM_ENABLE_LEGACY_ELECTRON_NET=1`
- The terminal shell is now much closer to TideTerm's compact term surface, but it still lacks TideTerm's multi-session sidebar, search UI, and shell-integration toolbar details.
- The AI panel now uses a TideTerm-shaped header with widget context toggle and overflow menu, and it now has a real backend-owned conversation path in addition to the existing runtime, audit, and policy surfaces.
- Prompt profile, role preset, and work mode controls now live in an AI mode strip near the top of the message feed instead of in the footer.
- The AI panel welcome card now exposes runtime-backed quick actions for terminal inspection, tab listing, and audit navigation as the current closest-compatible equivalent to deeper TideTerm AI flows.
- The AI panel now keeps a merged transcript:
  - backend-owned conversation messages persisted by the Go runtime
  - runtime-backed quick actions, approval decisions, and posture updates kept in the frontend activity feed
- The active compat AI panel now supports local attachment references:
  - attach flow creates backend-issued references from local filesystem paths
  - conversation messages persist attachment reference metadata (`id`, `name`, `path`, `mime_type`, `size`, `modified_time`)
  - reload restores attachment references from backend conversation snapshot truth
  - user-visible chips now label attachment references explicitly as `local ref`
  - stale local references are rendered as `missing` in the composer after backend rejection (`attachment_not_found`)
  - non-text/binary references rendered from backend truth are marked `metadata only` in transcript chips
  - submit-time message handling revalidates references; missing/invalid paths are rejected explicitly instead of being accepted as normal input
  - conversation provider requests now include bounded attachment context when attachments are present (metadata plus bounded text excerpt for supported text-like files)
  - attachment context limits are backend-owned and deterministic: max file size `256 KiB`, max read `32 KiB`, max excerpt `8000` chars, max context items `4`
  - files are not imported into managed app storage; references can become stale if files move or are deleted
- The AI composer now supports one explicit command execution grammar:
  - `/run <command>`
  - `run: <command>`
- That grammar is intentionally narrow for `1.0.0`. Free-text prompts still use the conversation backend. Only explicit `/run` prompts trigger terminal command execution.
- `/run` without a command now returns explicit format guidance instead of silently falling back to generic conversation handling.
- `/run` currently targets the active terminal widget only.
- `/run` tool execution now includes explicit session targeting derived from the active widget binding:
  - `target_session` (`local` or `remote`)
  - `target_connection_id` (`local` or concrete SSH connection ID)
- Conversation/explain context now also accepts explicit target fields for cross-surface handoffs:
  - `target_session`
  - `target_connection_id`
  - these fields provide context truth only and do not execute or reroute commands by themselves
- The frontend AI command flow is:
  1. capture the current terminal `next_seq`
  2. execute `term.send_input` through the real tool/runtime/policy path
  3. wait for terminal output from that `next_seq`
  4. render a local assistant message with the sanitized observed command output
  5. call the backend explanation route
  6. append a real assistant message to the persisted conversation transcript
- Structured execution blocks are now backend-owned snapshots appended during terminal explain for `/run` flow:
  - explain response now includes `execution_block_id`, resolved `command_audit_event_id`, and `explain_audit_event_id`
  - explain requests can include `execution_block_id` to update the existing block identity instead of appending a duplicate record
  - block snapshots are available via:
    - `GET /api/v1/execution/blocks`
    - `GET /api/v1/execution/blocks/{blockID}`
  - block snapshots are additive workflow records and do not replace terminal/audit source-of-truth paths
- The AI panel now renders a compact structured-execution strip from backend block snapshots:
  - each item shows command intent, execution state, output excerpt, explain summary/error, and provenance IDs
  - rendering is additive and keeps existing transcript/approval flow intact
  - block-fetch failures are non-blocking and do not stop `/run`, explain, or normal conversation flows
  - each item now exposes explicit actions:
    - `Explain` (explicit explain call with block identity/context)
    - `Re-run` (explicit command re-execution through existing `/run` tool path)
    - `Copy` and `Reveal Provenance` (operator-visible command/provenance access)
- The backend explanation route does not execute commands by itself. It explains the observed result of a command that already ran through the runtime.
- The compat terminal now has an explicit `Explain Latest Output In AI` handoff action:
  - it resolves the latest terminal command from audit truth for the active widget
  - it calls the existing explain route with explicit widget/target context
  - it does not execute new terminal commands
- If command execution succeeds but explanation fails, the shell now reports that explicitly and falls back to the captured terminal output summary instead of claiming a clean explain success.
- Approval remains in force for AI command execution:
  - if the active policy profile escalates `term.send_input` to `dangerous`, `/run` returns an approval requirement
  - the active compat panel now keeps the pending `/run` request in an explicit in-memory retry context and rehydrates it when the panel remounts in the same frontend session
  - confirm uses the existing `safety.confirm` tool contract and retries the original `term.send_input` request with the returned one-time `approval_token`
  - the backend now enforces that the approved retry matches the original execution intent instead of trusting `tool_name` alone
  - the backend rejects `/run` tool execution if the explicit target session does not match the destination widget session (`local` vs `remote`)
  - the resulting explanation call derives `approval_used` from the matching `term.send_input` audit truth; the backend no longer trusts a frontend-supplied explain flag
  - audit events for both `term.send_input` and `agent.terminal_command` now include explicit session target fields (`target_session`, `target_connection_id`)
  - a full frontend reload still loses pending retry context because this slice does not add persistence
- Capability-removing modes such as `secure` can still forbid `/run` entirely. In that case the AI command path is denied rather than approval-gated.
- The AI panel footer now includes a TideTerm-shaped composer. It still maps a small set of explicit runtime-backed intents such as terminal inspection, tab listing, widget listing, active-tab lookup, and terminal interrupt to the tool/runtime path, but all other free-text prompts now go through the real backend conversation route.
- The conversation backend currently uses Ollama over HTTP with non-streaming chat completions. Assistant responses are real provider outputs, not local placeholders.
- Conversation persistence remains full-transcript, but provider requests are now bounded to a recent tail before being sent to Ollama.
- The current provider request budget is deterministic and backend-owned:
  - `RTERM_CONVERSATION_MAX_MESSAGES` default `24`
  - `RTERM_CONVERSATION_MAX_CHARS` default `12000`
- Role preset, work mode, and prompt profile selection project into the backend system prompt through the Go app layer before the request reaches the provider.
- Provider failures are recorded as assistant error messages in the transcript and as audit events. They are not silently swallowed by the frontend.
- Operator, settings, and audit navigation are now secondary header-menu controls rather than part of the primary composer surface.
- The AI transcript now renders runtime tool activity with explicit tool names, operation summaries, affected widgets/paths, and approval-use markers so the feed behaves more like a working AI/tool conversation surface instead of a generic log.
- The AI composer now exposes TideTerm-like control affordances: an attach button, prompt suggestion chips, and a send action.
- Streaming assistant output is not implemented yet. The current provider path waits for a complete response and then appends a complete or error assistant message to the transcript.
- Shell settings and audit now use more TideTerm-like utility placement: they stay secondary to the terminal and AI panel, but they are reachable from the right-side dock through dedicated utility menus instead of only raw operator sections.
- Runtime bootstrap failures now show launch-path recovery hints in the shell (rebuild core binary, use `npm run tauri:dev`, verify dependencies).
- Widget/app discoverability now uses a closest-compatible launcher flyout in the dock instead of a full TideTerm app catalog. It is intentionally limited to shell entry points and current widgets until a broader launcher/app domain exists.
- The new launcher section is likewise a closest-compatible equivalent: it mirrors TideTerm’s searchable discovery feel, but it currently catalogs shell surfaces and known widgets rather than a full local app registry.
- The settings surface is still a closest-compatible equivalent, not exact parity with TideTerm’s broader waveconfig/help universe.
- The remote foundation is now real but intentionally narrow: SSH uses the local system `ssh` binary instead of TideTerm's older remote controller stack.
- SSH profile management currently supports only direct saved host/user/port/identity-file fields. It does not import `~/.ssh/config`, negotiate richer auth flows, or provide long-lived remote status tracking.
- A real SSH happy path is now validated against one reachable host, but that does not mean the runtime has a persistent remote controller or full TideTerm remote parity.
