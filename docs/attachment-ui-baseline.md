# Attachment UI baseline

## Click-through flow used

Environment:

- backend: `go run ./cmd/rterm-core serve --listen 127.0.0.1:52932 ...`
- frontend dev: `npm --prefix frontend run dev -- --host 127.0.0.1 --port 5179 --strictPort`
- auth: `RTERM_AUTH_TOKEN=attach-ui-token`
- provider: local mock HTTP endpoint on `127.0.0.1:11446`

UI flow:

1. Open `http://127.0.0.1:5179/`.
2. Open AI panel from left `AI` toggle.
3. Click attach button (`paperclip`) in AI composer.
4. Select local file `attach-ui-small.txt` (repo root path).
5. Enter prompt `Please acknowledge attached file keyword.` and send.
6. Observe assistant response (`ui-attachment-reply` from mock provider).
7. Reload page and reopen AI panel.

## What user sees before send

- Attached file appears in composer attachment strip:
  - filename `attach-ui-small.txt`
  - file size (`43 B`)
  - tooltip path with local filesystem location.

## What user sees after send

- User message is rendered in transcript.
- Attachment reference chip is rendered under user message.
- Assistant response appears normally.

## What user sees after reload

- Reloaded AI panel shows same user message from backend snapshot.
- Attachment reference chip remains visible in transcript after reload.
- Assistant response remains visible.

## Backend truth vs visible UI mismatch observed

- In browser-dev compat path, file chooser may expose only filename-level path info.
- If selected file is not resolvable against `repo_root`, attach step fails with backend error (`attachment not found`) even though user performed a valid file pick action.
- Error is visible, but cause is not explicit in UI (path-resolution/runtime constraint is implicit).

## Slice boundary

- No preview system.
- No storage redesign.
- No broad AI panel cleanup.
