# Workflow identity result

Date: `2026-04-16`  
Phase: `1.0.0-rc1` release hardening

## 1. Identity/provenance improvements

- Terminal explain now accepts explicit execution identity (`command_audit_event_id`) and backend explain audit derivation uses that explicit event identity when provided.
- Cross-surface execution/audit provenance now carries explicit `action_source` across:
  - tool/runtime executions (`term.send_input`, `workspace.*`, etc.)
  - AI conversation submits/explain calls
  - MCP invoke requests
- MCP invoke now appends explicit backend audit events (`tool_name: "mcp.invoke"`) with success/error truth and provenance fields.
- File attachment reference creation now appends explicit backend audit events (`tool_name: "agent.attachment_reference"`) with path and source metadata.
- File -> `/run` helper now shows an explicit “prepared prompt (not sent)” preview so handoff intent is visible before send.

## 2. Still intentionally manual

- File -> AI prompt and file -> `/run` remain operator-confirmed handoffs; no automatic send/execute is introduced.
- Terminal explain remains explicit button-driven action.
- MCP invoke remains explicit button-driven action from the tools surface.

## 3. Still intentionally conservative

- Explain identity hardening keeps legacy fallback behavior when explicit command audit identity is not provided.
- File -> `/run` helper stays a conservative prompt-prep helper; it does not attempt command synthesis beyond explicit path insertion.
- Provenance is additive metadata (`action_source`) and does not change existing approval/policy decision rules.

## 4. Real remaining friction points

- Provenance for “file path inserted into AI composer then manually submitted later” is still coarse (`ai.panel.submit_message`) and does not encode each intermediate UI prep step as a distinct backend event.
- Explicit explain command identity currently depends on caller-supplied `command_audit_event_id`; direct ad-hoc terminal typing outside audited `term.send_input` lineage remains outside this binding path.
- MCP server lifecycle actions (`start/stop/restart/enable/disable`) remain separate operational controls and are not collapsed into one composite workflow record.
