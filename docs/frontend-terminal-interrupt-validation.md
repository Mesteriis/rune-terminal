# Frontend Terminal Interrupt Validation

Validation date: `2026-04-15`

Runtime launch:

```bash
RTERM_AUTH_TOKEN=test-token ./apps/desktop/bin/rterm-core serve \
  --listen 127.0.0.1:0 \
  --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal \
  --state-dir /tmp/rterm-slice4-yEFjTa/state \
  --ready-file /tmp/rterm-slice4-yEFjTa/ready.json
```

Resolved runtime base URL in this run: `http://127.0.0.1:61384`.

## Verified active interrupt path wiring

- `TerminalSurface` interrupt button calls `onInterrupt(widgetId)`.
- `App` wires `onInterrupt={shell.interruptWidget}`.
- `useRuntimeShell.interruptWidget` is provided by `useTerminalActions`.
- `useTerminalActions.interruptWidget` executes `term.interrupt` through `useRuntimeShell.executeTool`.
- `executeTool` runs through `POST /api/v1/tools/execute`.

## API/runtime validation

Input setup:

```bash
curl -sS -H 'Authorization: Bearer test-token' -H 'Content-Type: application/json' \
  -X POST http://127.0.0.1:61384/api/v1/tools/execute \
  -d '{"tool_name":"term.send_input","input":{"widget_id":"term-main","text":"sleep 15","append_newline":true},"context":{"workspace_id":"ws-local","repo_root":"/Users/avm/projects/Personal/tideterm/runa-terminal","active_widget_id":"term-main"}}'
```

Interrupt call:

```bash
curl -sS -H 'Authorization: Bearer test-token' -H 'Content-Type: application/json' \
  -X POST http://127.0.0.1:61384/api/v1/tools/execute \
  -d '{"tool_name":"term.interrupt","input":{"widget_id":"term-main"},"context":{"workspace_id":"ws-local","repo_root":"/Users/avm/projects/Personal/tideterm/runa-terminal","active_widget_id":"term-main"}}'
```

Observed interrupt response:

```json
{"status":"ok","output":{"interrupted":true,"status":"running","widget_id":"term-main"}}
```

Observed state/output after interrupt attempt:

- `term.get_state` remained `status:"running"` with `can_interrupt:true`
- terminal snapshot later returned prompt restoration at `2026-04-15T15:11:54.818401Z`
- command completion timing matched natural `sleep 15` duration in this run

## Audit visibility for interrupt

`/api/v1/audit?limit=20` included interrupt events:

- `tool_name:"term.interrupt"`
- `success:true`
- `summary:"interrupt terminal session for term-main"`
- `affected_widgets:["term-main"]`

## Conclusion

- interrupt action is reachable in the active UI/store path
- backend interrupt tool path is reachable and returns structured `ok` responses
- state/audit transitions are visible
- immediate command cancellation was not consistently observable in this run, so full user-visible interrupt effectiveness remains a known limitation for this slice
