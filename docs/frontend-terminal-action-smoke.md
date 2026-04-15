# Frontend Terminal Action Smoke

Type: documented reproducible `curl + shell` sequence

Validation date: `2026-04-15`

## Preconditions

```bash
export RTERM_AUTH_TOKEN=test-token
export RTERM_REPO=/Users/avm/projects/Personal/tideterm/runa-terminal
tmpdir="$(mktemp -d /tmp/rterm-slice4-smoke-XXXXXX)"
mkdir -p "$tmpdir/state"

./apps/desktop/bin/rterm-core serve \
  --listen 127.0.0.1:0 \
  --workspace-root "$RTERM_REPO" \
  --state-dir "$tmpdir/state" \
  --ready-file "$tmpdir/ready.json"
```

Use `base_url` from ready output (example below uses `http://127.0.0.1:61384`).

## Step 1: bootstrap health and workspace

```bash
curl -sS http://127.0.0.1:61384/healthz
curl -sS -H "Authorization: Bearer $RTERM_AUTH_TOKEN" http://127.0.0.1:61384/api/v1/bootstrap
curl -sS -H "Authorization: Bearer $RTERM_AUTH_TOKEN" http://127.0.0.1:61384/api/v1/workspace
```

Expected:

- health returns `{"status":"ok"}`
- workspace has active widget (in this run: `term-main`)

## Step 2: input path (direct terminal endpoint)

```bash
curl -sS -H "Authorization: Bearer $RTERM_AUTH_TOKEN" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:61384/api/v1/terminal/term-main/input \
  -d '{"text":"echo slice4-input-http","append_newline":true}'

sleep 0.4
curl -sS -H "Authorization: Bearer $RTERM_AUTH_TOKEN" \
  "http://127.0.0.1:61384/api/v1/terminal/term-main?from=4"
```

Expected:

- input response includes `{ "widget_id":"term-main", "bytes_sent":..., "append_newline":true }`
- snapshot chunks include command echo/output

## Step 3: interrupt path (tool/runtime)

```bash
curl -sS -H "Authorization: Bearer $RTERM_AUTH_TOKEN" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:61384/api/v1/tools/execute \
  -d '{"tool_name":"term.send_input","input":{"widget_id":"term-main","text":"sleep 15","append_newline":true},"context":{"workspace_id":"ws-local","repo_root":"'"$RTERM_REPO"'","active_widget_id":"term-main"}}'

sleep 1
curl -sS -H "Authorization: Bearer $RTERM_AUTH_TOKEN" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:61384/api/v1/tools/execute \
  -d '{"tool_name":"term.interrupt","input":{"widget_id":"term-main"},"context":{"workspace_id":"ws-local","repo_root":"'"$RTERM_REPO"'","active_widget_id":"term-main"}}'

curl -sS -H "Authorization: Bearer $RTERM_AUTH_TOKEN" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:61384/api/v1/tools/execute \
  -d '{"tool_name":"term.get_state","input":{"widget_id":"term-main"},"context":{"workspace_id":"ws-local","repo_root":"'"$RTERM_REPO"'","active_widget_id":"term-main"}}'
```

Observed in this run:

- `term.interrupt` returned `status:"ok"` with `{ "interrupted": true }`
- audit recorded `term.interrupt` success events
- immediate command cancellation was not consistently observable (known limitation for this slice)

## Step 4: approval path

```bash
# trigger approval-required dangerous action
curl -sS -H "Authorization: Bearer $RTERM_AUTH_TOKEN" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:61384/api/v1/tools/execute \
  -d '{"tool_name":"safety.add_ignore_rule","input":{"scope":"repo","matcher_type":"glob","pattern":"slice4-approval-*","mode":"metadata-only","note":"slice4 validation"},"context":{"workspace_id":"ws-local","repo_root":"'"$RTERM_REPO"'","active_widget_id":"term-main"}}'

# confirm pending approval (replace approval_id)
curl -sS -H "Authorization: Bearer $RTERM_AUTH_TOKEN" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:61384/api/v1/tools/execute \
  -d '{"tool_name":"safety.confirm","input":{"approval_id":"<approval-id>"},"context":{"workspace_id":"ws-local","repo_root":"'"$RTERM_REPO"'","active_widget_id":"term-main"}}'

# retry original action with one-time token (replace approval_token)
curl -sS -H "Authorization: Bearer $RTERM_AUTH_TOKEN" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:61384/api/v1/tools/execute \
  -d '{"tool_name":"safety.add_ignore_rule","input":{"scope":"repo","matcher_type":"glob","pattern":"slice4-approval-*","mode":"metadata-only","note":"slice4 validation"},"approval_token":"<approval-token>","context":{"workspace_id":"ws-local","repo_root":"'"$RTERM_REPO"'","active_widget_id":"term-main"}}'
```

Expected:

- first call returns `status:"requires_confirmation"` + `pending_approval`
- `safety.confirm` returns token
- retry with token returns `status:"ok"`

Optional token replay proof:

```bash
curl -sS -H "Authorization: Bearer $RTERM_AUTH_TOKEN" -H "Content-Type: application/json" \
  -X POST http://127.0.0.1:61384/api/v1/tools/execute \
  -d '{"tool_name":"safety.add_ignore_rule","input":{"scope":"repo","matcher_type":"glob","pattern":"slice4-approval-replay-*","mode":"metadata-only","note":"slice4 replay"},"approval_token":"<consumed-token>","context":{"workspace_id":"ws-local","repo_root":"'"$RTERM_REPO"'","active_widget_id":"term-main"}}'
```

Expected:

- replayed token falls back to `requires_confirmation`
