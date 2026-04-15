# Validation Report

Validation date: `2026-04-15`

## Latest frontend asset pipeline validation (css + fonts)

This pass stayed validation-only and focused on the active compat asset path:

- identify which CSS actually loads on startup
- verify whether CSS is applied or merely requested
- identify which fonts actually load
- classify whether the visual drift comes from CSS failure, font absence, path breakage, or load order

Validation executed for this step:

```bash
npx tsc -p frontend/tsconfig.json --noEmit

RTERM_AUTH_TOKEN=asset-pipeline-token apps/desktop/bin/rterm-core serve --listen 127.0.0.1:52750 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/runa-asset-pipeline-state
VITE_RTERM_API_BASE=http://127.0.0.1:52750 VITE_RTERM_AUTH_TOKEN=asset-pipeline-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4183 --strictPort

VITE_RTERM_API_BASE=http://127.0.0.1:52750 VITE_RTERM_AUTH_TOKEN=asset-pipeline-token npm --prefix frontend run build
npm --prefix frontend run preview -- --host 127.0.0.1 --port 4184 --strictPort

# live browser validation against:
# - dev:     http://127.0.0.1:4183/
# - preview: http://127.0.0.1:4184/
# checks:
# - stylesheet requests and order
# - computed styles for body, #main, and terminal nodes
# - font resource requests
# - document.fonts state
# - synthetic replay of fontutil.ts /fonts/* URLs in preview
```

Observed result:

- TypeScript compile passed
- the active compat CSS pipeline is alive in both dev and production preview
- source `frontend/index.html` does not link CSS directly; it loads `frontend/wave.ts`, and the active compat CSS chain enters through `frontend/app/app.tsx`
- observed active CSS import order stayed:
  - `overlayscrollbars.css`
  - `app.scss`
  - `tailwindsetup.css`
- dev load showed successful `200 OK` requests for:
  - `/node_modules/overlayscrollbars/styles/overlayscrollbars.css`
  - `/app/app.scss`
  - `/tailwindsetup.css`
  - `/app/view/term/xterm.css`
  - transitive SCSS modules used by the rendered shell
- production preview showed a single linked stylesheet bundle:
  - `/assets/index-DtSIslWN.css`
- no CSS `404` requests were observed in dev or preview
- computed styles confirmed CSS application in both modes:
  - `body.margin = 0px`
  - `body.backgroundColor = rgb(34, 34, 34)`
  - `#main.display = flex`
  - root variables such as `--base-font`, `--fixed-font`, and `--main-bg-color` resolved
- the active compat shell made no font network requests during normal startup in dev or preview
- `document.fonts` contained no custom `FontFace` entries during the active compat load
- this matches the runtime path in `frontend/wave.ts`:
  - browser compat startup returns from `initBare()` before `loadFonts()`
  - custom fonts are intentionally disabled on the active compat path
- `frontend/util/fontutil.ts` still references relative legacy paths under `fonts/*`
- the frontend tree does not ship those assets:
  - no `frontend/fonts`
  - no `frontend/public/fonts`
  - no `frontend/dist/fonts`
- `frontend/dist/assets` contains KaTeX fonts but not the `Inter`, `Hack`, or `JetBrains Mono` files referenced by `fontutil.ts`
- synthetic replay of the same `fontutil.ts` URLs in production preview produced:
  - `A network error occurred.`
  - `Failed to decode downloaded font`
  - `OTS parsing error: invalid sfntVersion: 1008821359`
- direct fetch verification showed why:
  - `/fonts/inter-variable.woff2` returned `200` with `content-type: text/html`
  - the response body was SPA fallback HTML, not a font binary

Per-classification result for this slice:

- CSS not loading: `not supported by evidence`
- CSS loading but not applying: `not supported by evidence`
- fonts not loading on the active compat path: `confirmed`
- fonts intentionally disabled on the active compat path: `confirmed`
- legacy custom font path broken under `/fonts/*`: `confirmed`
- CSS order broken: `not observed`
- Vite base path as the validated root cause of the current visible drift: `not supported by evidence`

Current conclusion:

- the current visible styling drift is not explained by a dead CSS pipeline
- the active compat shell loads and applies CSS in both dev and production preview
- the strongest validated cause of the remaining design mismatch is missing custom fonts:
  - active compat path does not load them
  - legacy `fontutil.ts` paths point at non-shipped `/fonts/*` assets

## Latest frontend compat terminal stream race-safety validation

This pass stayed validation-only and focused on rapid tab switching in the active compat terminal path:

- rapid `Main Shell <-> Ops Shell` switching
- switch immediately after terminal input
- repeated switching on a warmed runtime
- new terminal tab stream lifecycle under rapid switching

Validation executed for this step:

```bash
RTERM_AUTH_TOKEN=compat-race-token apps/desktop/bin/rterm-core serve --listen 127.0.0.1:52749 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/runa-compat-race-safety-state
VITE_RTERM_API_BASE=http://127.0.0.1:52749 VITE_RTERM_AUTH_TOKEN=compat-race-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4182 --strictPort

# fresh browser verification against http://127.0.0.1:4182/
# - scenario A: fresh load, then Main Shell <-> Ops Shell rapid switching 5 round-trips
# - scenario B: type `echo race-b-1776276587916`, switch away almost immediately, return, inspect next_seq and output continuity
# - scenario C: warmed runtime, then Main Shell <-> Ops Shell rapid switching 8 round-trips
# - scenario D: Add Tab, then rapid switching between Main Shell and the new terminal tab
# - inspect page errors, console errors, active stream counts, abort source, store stream state, and terminal snapshots
```

Observed result:

- no page errors were raised during the validated rapid-switching scenarios
- no console errors or warnings were raised during the validated rapid-switching scenarios
- Playwright network inspection showed successful `200 OK` requests for:
  - `POST /api/v1/workspace/focus-tab`
  - `POST /api/v1/workspace/tabs`
  - `GET /api/v1/terminal/<widget>?from=0`
  - `GET /api/v1/terminal/<widget>/stream?...`
  - `POST /api/v1/terminal/term-main/input`
- aborted stream replacements were confirmed by runtime instrumentation rather than by Playwright failed-request output

Scenario A observations:

- initial load established the compat terminal for `term-main`
- during 5 rapid `Main Shell <-> Ops Shell` round-trips, the instrumented stream lifecycle showed:
  - 10 newly observed stream opens
  - 9 observed aborts for replaced streams
  - 1 final open stream for the active tab
- maximum concurrently open tracked terminal streams during the rapid-switch window was `1`
- no evidence of double subscription or dangling old stream was observed in this scenario

Scenario B observations:

- active input was sent to `term-main`, then the UI switched away almost immediately and back again
- the old `term-main` stream was aborted by the normal cleanup path, and the resumed `term-main` stream reopened from `from=41`
- while `term-main` was inactive, no late `chunk` events were observed for the inactive terminal path after `stream-stop`
- on return, the refreshed snapshot advanced from `next_seq=38` to `next_seq=41`
- server-side terminal snapshot verification showed:
  - `markerCount: 1` for `race-b-1776276587916`
  - no duplicate chunk sequences
  - no sequence gaps
- observed interpretation:
  - output generated while the tab was inactive was recovered through snapshot refresh on remount
  - no lost output or duplicated output was observed for this scenario

Scenario C observations:

- on a warmed runtime, 8 additional rapid round-trips produced:
  - 16 newly observed stream opens
  - 15 observed aborts for replaced streams
  - 1 final open stream for the active tab
- maximum concurrently open tracked terminal streams during the warmed rapid-switch window was again `1`
- no accumulation of old open streams was observed after the scenario

Scenario D observations:

- `Add Tab` created a new terminal widget `term_06c436c8147d987d`
- the new terminal stream lifecycle under rapid switching showed:
  - first open from `from=1`
  - later reopen from `from=3`
  - later reopen from `from=4`
- server-side snapshot verification for `term_06c436c8147d987d` showed:
  - `next_seq: 4`
  - chunk sequences `[1, 2, 3]`
  - no duplicate chunk sequences
  - no sequence gaps
- maximum concurrently open tracked terminal streams during the new-tab rapid-switch window was `1`
- no evidence of a duplicated live stream for the new terminal was observed

Per-observation classification for this slice:

- active stream replacement via `AbortController.abort()` during unmount/remount: `expected`
- `net::ERR_ABORTED` / canceled SSE stream requests for replaced subscriptions: `harmless but noisy`
- maximum tracked concurrent open stream count staying at `1` during scenarios A, C, and D: `expected`
- no observed dangling old streams after rapid switching: `expected`
- no observed late writes into the inactive terminal path after `stream-stop`: `expected`
- no observed duplicated chunk sequences in the validated server snapshots: `expected`
- no observed lost output for the validated input-and-switch scenario: `expected`
- transient `terminalStore` abort classification as `streamError: "BodyStreamBuffer was aborted"` after intentional cleanup: `suspicious but not proven`
  - this was observed in store events only
  - it did not surface as page errors, console errors, or visible terminal breakage in the validated compat path

Current conclusion:

- no proven race defect was reproduced in the active compat terminal stream lifecycle during the validated rapid-switching scenarios
- the remaining observed effects are canceled replaced streams and transient internal abort-as-error bookkeeping
- no code change was applied in this validation slice

## Latest frontend compat terminal runtime stabilization slice

This pass focused only on the active compat terminal path:

- initial terminal mount
- new tab -> terminal mount
- tab switching as needed to re-enter terminal mount
- terminal input

Validation executed for this step:

```bash
npx tsc -p frontend/tsconfig.json --noEmit
npm --prefix frontend run build

RTERM_AUTH_TOKEN=compat-term-token apps/desktop/bin/rterm-core serve --listen 127.0.0.1:52747 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/runa-compat-term-runtime-state
VITE_RTERM_API_BASE=http://127.0.0.1:52747 VITE_RTERM_AUTH_TOKEN=compat-term-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4180 --strictPort

# fresh browser verification against http://127.0.0.1:4180/
# - initial load
# - Add Tab -> terminal mount
# - switch back to Ops Shell
# - type `echo compat-term-slice`
# - switch to the new shell again
# - inspect page errors, console errors, failed requests, terminal snapshot responses, and input posts
```

Observed result:

- TypeScript compile passed
- frontend production build passed
- initial compat terminal mount completed without page or console runtime errors
- `Add Tab` mounted a new terminal without reproducing `TypeError: snapshot.chunks is not iterable`
- tab switching completed without page or console runtime errors
- typing in the visible terminal produced successful `POST /api/v1/terminal/term-side/input` requests
- the first snapshot response for the new terminal still returned malformed data with `chunks:null`
- the active compat terminal path remained stable because `terminalStore.refresh()` now normalizes that malformed payload to `chunks: []` before storing or replaying it
- later snapshot responses for the same terminal returned normal chunk arrays and continued rendering correctly

Per-issue status for this slice:

- `TypeError: snapshot.chunks is not iterable`: `fixed`
  - crash source remained `frontend/app/view/term/termwrap.ts`
  - root cause was a malformed compat snapshot payload with `chunks:null` on first new-tab mount
  - active-path fix was applied at the snapshot ingress boundary in `frontend/app/state/terminal.store.ts`

Additional observation:

- browser network inspection still showed `net::ERR_ABORTED` for replaced terminal SSE stream requests during tab switches
- runtime instrumentation showed the abort source was the active compat terminal cleanup path:
  - `frontend/app/view/term/compat-terminal.tsx` unmount cleanup
  - `TermWrap.dispose()`
  - `terminalStore.stop()`
  - `TerminalStore.stopStream()`
  - `AbortController.abort()` on the previous `/api/v1/terminal/<widget>/stream` request
- those aborts did not surface as page errors or console errors in the verified compat terminal flow
- terminal input remained functional, and the post-switch stream resumed from the updated sequence without observed data loss
- classification: `harmless but noisy`
  - this is expected client-side cancellation when replacing the active terminal SSE subscription
  - the browser may still show the canceled stream as `net::ERR_ABORTED` in network tooling even though the UI flow remains stable

## Latest frontend compat console/runtime stabilization slice

This pass focused only on the active visible compat shell path:

- compat startup in the browser/dev path
- active tab render
- tab switching
- terminal input
- isolation of legacy `/wave/service` and WOS calls from those visible compat flows

Validation executed for this step:

```bash
npx tsc -p frontend/tsconfig.json --noEmit
npm --prefix frontend run build

RTERM_AUTH_TOKEN=compat-slice-token apps/desktop/bin/rterm-core serve --listen 127.0.0.1:52746 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/runa-compat-console-slice-state-fresh
VITE_RTERM_API_BASE=http://127.0.0.1:52746 VITE_RTERM_AUTH_TOKEN=compat-slice-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4179 --strictPort

# fresh browser verification against http://127.0.0.1:4179/
# - hard load
# - inspect console + request failures
# - switch Main Shell <-> Ops Shell
# - type `echo compat-slice-smoke` in the visible terminal
# - confirm typed input reached /api/v1/terminal/<widget>/input
# - targeted right-click tab check for legacy WOS leakage
```

Observed result:

- TypeScript compile passed
- frontend production build passed
- fresh compat load produced no page errors, no console errors, and no failed network requests
- workspace shell, tabs, and terminal were visible on first load
- switching between `Main Shell` and `Ops Shell` used `POST /api/v1/workspace/focus-tab` with `200 OK`
- typing in the visible compat terminal produced `POST /api/v1/terminal/term-side/input` with `200 OK`
- `GET /api/v1/terminal/term-side?from=0` showed the echoed output `compat-slice-smoke`
- targeted right-click on a visible tab produced no `/wave/service` requests and no `object.GetObject` failure after the compat context-menu isolation
- the compat tab bar no longer rendered the legacy workspace switcher control

Per-issue status for this slice:

- `A network error occurred.`: `fixed`
  - root cause was unhandled `FontFace.load()` rejection on missing compat font assets
  - no `NetworkError` page errors remained on fresh compat load after custom font loading was removed from compat startup
- `/wave/service` 404: `fixed` on the verified compat flow
  - no `/wave/service` requests were observed during fresh load, tab switching, terminal input, or targeted tab right-click verification
  - the compat add-tab path also no longer issued `/wave/service`; it stayed on typed workspace routes
- `call object.GetObject failed: 404 Not Found`: `fixed` on the verified compat flow
  - targeted tab right-click verification no longer triggered `object.GetObject` or any `/wave/service` request
- `window.requestIdleCallback is not a function`: `fixed`
  - the exact compat terminal call site now uses a guarded fallback in `frontend/app/view/term/termwrap.ts`
  - the error was not reproducible after the patch in the verified browser run
- font decode / missing styles issues: `fixed` for compat startup
  - the missing legacy `/fonts/*` requests and decode warnings did not appear on the fresh compat load

Historical out-of-scope observation at the time, now superseded by `c025cd0`:

- clicking `Add Tab` no longer issued `/wave/service`, but a separate compat new-tab mount error was still observed:
  - `TypeError: snapshot.chunks is not iterable`
  - source reported by the browser: `frontend/app/view/term/termwrap.ts`
  - this was not part of the requested initial-load / active-render / tab-switch / terminal-input stabilization slice at that time
  - this is no longer an active validation outcome: it was fixed later by `c025cd0` in the dedicated compat terminal runtime stabilization slice documented above

What was not expanded in this step:

- AI panel behavior was not reworked
- workspace editing flows were not reworked
- unrelated legacy/frontend cleanup was not attempted

## Latest UI recovery slice

This pass focused only on the release-blocking visible workspace and terminal recovery:

- browser/Tauri compat bootstrap mounts the existing app shell again
- typed workspace state now reaches visible tabs and active-widget selection
- terminal widget mounts from the typed terminal store path
- compat-only legacy render blockers were removed without redesigning the UI

Validation executed for this step:

```bash
RTERM_AUTH_TOKEN=ui-recovery-token ./apps/desktop/bin/rterm-core serve --listen 127.0.0.1:52745 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/runa-ui-recovery-state
VITE_RTERM_API_BASE=http://127.0.0.1:52745 VITE_RTERM_AUTH_TOKEN=ui-recovery-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4178 --strictPort
npx tsc -p frontend/tsconfig.json --noEmit
npm --prefix frontend run build
curl -sf -H 'Authorization: Bearer ui-recovery-token' http://127.0.0.1:52745/healthz
curl -sf -H 'Authorization: Bearer ui-recovery-token' http://127.0.0.1:52745/api/v1/workspace
curl -sf -H 'Authorization: Bearer ui-recovery-token' http://127.0.0.1:52745/api/v1/terminal/term-main?from=0
curl -s -X POST -H 'Authorization: Bearer ui-recovery-token' -H 'Content-Type: application/json' -d '{}' http://127.0.0.1:52745/api/v1/workspace/tabs

# live MCP browser verification against http://127.0.0.1:4178/
# - page load
# - visible workspace shell and tabs
# - terminal input click/type
# - tab switch click
# - console/network inspection
```

Observed result:

- TypeScript compile passed
- frontend production build passed
- `GET /healthz` returned `{"status":"ok"}`
- `GET /api/v1/workspace` returned live typed workspace state including `active_tab_id`, `active_widget_id`, tabs, and widgets
- `GET /api/v1/terminal/term-main?from=0` returned a running terminal snapshot with buffered chunks
- MCP browser showed a visible workspace shell with rendered tabs and terminal surface
- typing in the terminal produced `POST /api/v1/terminal/<widget>/input` requests with `200 OK`
- typed text appeared in the visible terminal output
- tab switching produced `POST /api/v1/workspace/focus-tab` with `200 OK`
- after the switch, `GET /api/v1/workspace` reflected the clicked tab as `active_tab_id`
- no fatal render-path console errors remained in the recovered compat path

What was not fully resolved in this step:

- the dev console still reports bundled-font decode warnings in the current dev environment
- the dev console still shows generic `A network error occurred.` messages from existing terminal/browser integrations
- workspace switcher editing flows and broader legacy shell surfaces were intentionally not reworked in this slice
- validation used a temporary local state directory; one extra tab used for tab-switch smoke was recreated through the workspace API inside that temp state

All commands below were run against the repository in its current state on macOS arm64.

## Latest `1.0.0-rc1` hardening pass

This pass focused on release hardening and docs truthfulness only:

- terminal copy/paste sanity and long-output resilience in the shell
- `/run` UX clarity and explain-result fallback handling
- remote launch failure message clarity
- launch-path clarity in runtime bootstrap errors
- release checklist + known limitations + docs alignment

Validation executed for this step:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
./scripts/go.sh test ./cmd/... ./core/... ./internal/...
./scripts/go.sh build ./cmd/... ./core/... ./internal/...
npm run validate
npm run build:core
npm run tauri:dev
curl -sf http://127.0.0.1:52732/healthz
curl -sf http://127.0.0.1:5173
```

Observed result:

- frontend lint passed
- frontend build passed
- full Go test suite passed for `./cmd/... ./core/... ./internal/...`
- Go build passed for `./cmd/... ./core/... ./internal/...`
- full `npm run validate` passed
- `npm run build:core` rebuilt the sidecar binary
- `npm run tauri:dev` launched successfully and printed `{"base_url":"http://127.0.0.1:52732","pid":6726}`
- `GET /healthz` on the tauri-launched sidecar returned `{"status":"ok"}`
- Vite dev entry responded at `http://127.0.0.1:5173`

Release smoke notes for this pass:

- shell notices now preserve multiline actionable details for remote launch failures
- `/run` now gives explicit guidance for empty command and no-active-terminal cases
- explain-result path now reports failed explanation honestly and falls back to observed terminal output summary

What was not fully validated in this step:

- no browser-driven click automation was run for copy/paste or long-output behavior; those paths were validated by lint/build/runtime launch and code-path inspection
- a fresh reachable-host remote SSH smoke was not rerun in this pass (latest reachable-host evidence remains in prior validation sections)

## Latest AI terminal command execution slice

The latest AI step focused only on one release-blocking feature:

- explicit `/run <command>` terminal execution from the current AI panel grammar
- backend explanation of the resulting terminal output
- continued use of the real tool runtime, policy model, and approval flow

Validation executed for this step:

```bash
./scripts/go.sh test ./core/conversation ./core/app ./core/transport/httpapi
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
npm run build:core
npm run tauri:dev
curl -sf http://127.0.0.1:<tauri-sidecar-port>/healthz

# fresh standalone sidecar for API smoke
RTERM_AUTH_TOKEN=smoketoken apps/desktop/bin/rterm-core serve --workspace-root . --state-dir <temp-state-dir>
curl -sf -H 'Authorization: Bearer smoketoken' http://127.0.0.1:<manual-port>/api/v1/bootstrap
curl -sf -H 'Authorization: Bearer smoketoken' http://127.0.0.1:<manual-port>/api/v1/agent

# safe command path
curl -s -H 'Authorization: Bearer smoketoken' -H 'Content-Type: application/json' http://127.0.0.1:<manual-port>/api/v1/tools/execute -d '{"tool_name":"term.send_input","input":{"widget_id":"term-main","text":"echo ai-exec-smoke","append_newline":true},"context":{"workspace_id":"ws-local","repo_root":"<repo>","active_widget_id":"term-main"}}'
curl -sf -H 'Authorization: Bearer smoketoken' http://127.0.0.1:<manual-port>/api/v1/terminal/term-main?from=<pre-seq>
curl -s -H 'Authorization: Bearer smoketoken' -H 'Content-Type: application/json' http://127.0.0.1:<manual-port>/api/v1/agent/terminal-commands/explain -d '{"prompt":"/run echo ai-exec-smoke","command":"echo ai-exec-smoke","widget_id":"term-main","from_seq":<pre-seq>,"approval_used":false,"context":{"workspace_id":"ws-local","repo_root":"<repo>","active_widget_id":"term-main","widget_context_enabled":true}}'

# approval-gated command path under hardened profile
curl -sf -X PUT -H 'Authorization: Bearer smoketoken' -H 'Content-Type: application/json' http://127.0.0.1:<manual-port>/api/v1/agent/selection/profile -d '{"id":"hardened"}'
curl -sf -X PUT -H 'Authorization: Bearer smoketoken' -H 'Content-Type: application/json' http://127.0.0.1:<manual-port>/api/v1/agent/selection/mode -d '{"id":"implement"}'
curl -s -H 'Authorization: Bearer smoketoken' -H 'Content-Type: application/json' http://127.0.0.1:<manual-port>/api/v1/tools/execute -d '{"tool_name":"term.send_input","input":{"widget_id":"term-main","text":"echo ai-approval-summary","append_newline":true},"context":{"workspace_id":"ws-local","repo_root":"<repo>","active_widget_id":"term-main"}}'
curl -s -H 'Authorization: Bearer smoketoken' -H 'Content-Type: application/json' http://127.0.0.1:<manual-port>/api/v1/tools/execute -d '{"tool_name":"safety.confirm","input":{"approval_id":"<approval-id>"},"context":{"workspace_id":"ws-local","repo_root":"<repo>","active_widget_id":"term-main"}}'
curl -s -H 'Authorization: Bearer smoketoken' -H 'Content-Type: application/json' http://127.0.0.1:<manual-port>/api/v1/tools/execute -d '{"tool_name":"term.send_input","input":{"widget_id":"term-main","text":"echo ai-approval-summary","append_newline":true},"approval_token":"<approval-token>","context":{"workspace_id":"ws-local","repo_root":"<repo>","active_widget_id":"term-main"}}'
curl -s -H 'Authorization: Bearer smoketoken' -H 'Content-Type: application/json' http://127.0.0.1:<manual-port>/api/v1/agent/terminal-commands/explain -d '{"prompt":"/run echo ai-approval-summary","command":"echo ai-approval-summary","widget_id":"term-main","from_seq":<pre-seq>,"approval_used":true,"context":{"workspace_id":"ws-local","repo_root":"<repo>","active_widget_id":"term-main","widget_context_enabled":true}}'
```

Observed result:

- targeted Go tests passed for the new conversation/app/HTTP path
- frontend lint passed
- frontend build passed
- full `npm run validate` passed
- `npm run tauri:dev` launched successfully and the sidecar returned `{"status":"ok"}` from `GET /healthz`
- on a fresh standalone sidecar:
  - `GET /api/v1/bootstrap` returned the active terminal widget `term-main`
  - a safe `term.send_input` call with `echo ai-exec-smoke` returned `status:"ok"`
  - the terminal snapshot showed `ai-exec-smoke` in the PTY output
  - `POST /api/v1/agent/terminal-commands/explain` returned a real assistant message from Ollama summarizing that command output with `provider_error:""`
  - the conversation snapshot now contained a persisted assistant message with provider/model metadata
- under `profile:"hardened"` and `mode:"implement"`:
  - `term.send_input` returned `status:"requires_confirmation"` and `error_code:"approval_required"`
  - `safety.confirm` returned a one-time approval token
  - retrying `term.send_input` with that token returned `status:"ok"`
  - after waiting for terminal output, the explanation route returned a real assistant message summarizing the approved command output with `approval_used:true`
- under `mode:"secure"` the same command path returned `policy_denied` because `terminal:input` is removed in that mode; this is now explicitly part of the documented semantics

What was not fully validated in this step:

- browser-driven click smoke for the AI panel was still unavailable because local browser automation could not connect in this environment
- the panel wiring therefore remains validated by build plus real backend/API/runtime smoke rather than by click automation
- streaming assistant output was not validated because streaming is not implemented in this slice
- attachments remain a placeholder and were not validated

## Latest release planning lock

The latest step focused only on release control documents:

- `docs/release-1.0.md`
- `docs/roadmap-1.0.md`
- `docs/parity-matrix.md`

This step changed scope tracking and prioritization only.
It did not change runtime semantics, transport behavior, frontend behavior, or build inputs.

Validation executed for this step:

- docs review only

Observed result:

- `1.0.0` scope, blockers, non-goals, and milestone ladder are now explicit
- parity tracking now includes release priority, exact release gap, and next concrete step per area
- the next implementation slice is clearly locked as `AI terminal command execution`

What was not re-validated in this step:

- frontend build and runtime launch were not re-run because no executable files changed
- earlier code-validation results remain the latest executable validation state

## Latest AI conversation backend foundation slice

The latest AI step focused only on replacing the fake free-text fallback with a real backend conversation path:

- the Go runtime now owns a persisted conversation transcript
- free-text prompts now travel through `/api/v1/agent/conversation/messages`
- assistant replies now come from Ollama instead of a local placeholder
- runtime/action/approval feed entries still coexist with the new conversation transcript
- `tauri:dev` now rebuilds the Go sidecar before launch so new backend routes are not hidden behind a stale binary

Validation executed for this step:

```bash
./scripts/go.sh test ./core/conversation ./core/app ./core/transport/httpapi
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
npm run build:core
RTERM_AUTH_TOKEN=smoke-token apps/desktop/bin/rterm-core serve --workspace-root . --state-dir /tmp/rterm-conv-smoke
curl -sf -H 'Authorization: Bearer smoke-token' http://127.0.0.1:<manual-port>/api/v1/agent/conversation
curl -sf -H 'Authorization: Bearer smoke-token' -H 'Content-Type: application/json' http://127.0.0.1:<manual-port>/api/v1/agent/conversation/messages -d '{"prompt":"Reply with exactly: smoke-conversation-ok","context":{"workspace_id":"ws-default","repo_root":"<repo>","active_widget_id":"term_boot","widget_context_enabled":true}}'
curl -sf -H 'Authorization: Bearer smoke-token' http://127.0.0.1:<manual-port>/api/v1/audit?limit=5
npm run tauri:dev
curl -sf http://127.0.0.1:<tauri-sidecar-port>/healthz
```

Observed result:

- targeted Go tests passed for conversation, app, and HTTP transport
- frontend lint passed
- frontend build passed
- full `npm run validate` passed
- a freshly rebuilt standalone `rterm-core` returned:
  - a valid empty conversation snapshot with provider metadata
  - a real assistant reply from Ollama for the prompt `Reply with exactly: smoke-conversation-ok`
  - `provider_error:""` and an assistant transcript entry with `content:"smoke-conversation-ok"`
  - an audit event with `tool_name:"agent.conversation"`, `prompt_profile_id:"balanced"`, `role_id:"developer"`, and `mode_id:"implement"`
- one earlier honest failure path was also observed during this step: when the provider defaulted to a heavier model, the transcript recorded the timeout as an assistant error message and the audit log recorded the provider failure; the provider preference was then tightened toward responsive local models
- a fresh `npm run tauri:dev` launch succeeded after the new backend/API work, and `GET /healthz` on the Tauri-launched sidecar returned `{"status":"ok"}`

What was not fully validated in this step:

- browser-driven click smoke for the AI panel was still unavailable because local browser automation was not connected in this environment
- streaming assistant output was not validated because streaming is not implemented in this slice
- file attachment transport was not validated because it remains a placeholder affordance

## Latest real SSH launch slice

The latest remote step focused only on one honest end-to-end SSH launch path and truthful failure reporting:

- SSH shells no longer inherit the lifetime of the HTTP request that created the tab
- remote tab creation now waits for the SSH shell to become usable before reporting success
- the connection catalog records real launch success and failure against an actually reachable host
- the shell now distinguishes preflight warnings from launch success/failure in the connections panel

Validation executed for this step:

```bash
./scripts/go.sh test ./core/terminal ./core/app ./core/connections ./core/transport/httpapi
npm --prefix frontend run lint
npm --prefix frontend run build
npm run build:core
RTERM_AUTH_TOKEN=test-token apps/desktop/bin/rterm-core serve --workspace-root . --state-dir /tmp/rterm-real-ssh-state.XXXXXX
curl -sf -H 'Authorization: Bearer test-token' http://127.0.0.1:<manual-port>/api/v1/connections
curl -sf -X POST -H 'Authorization: Bearer test-token' -H 'Content-Type: application/json' http://127.0.0.1:<manual-port>/api/v1/connections/ssh -d '{"name":"LAN Root","host":"192.168.1.2","user":"root","port":22}'
curl -sf -X POST -H 'Authorization: Bearer test-token' http://127.0.0.1:<manual-port>/api/v1/connections/<connection-id>/check
curl -sf -X PUT -H 'Authorization: Bearer test-token' -H 'Content-Type: application/json' http://127.0.0.1:<manual-port>/api/v1/connections/active -d '{"connection_id":"<connection-id>"}'
curl -sf -X POST -H 'Authorization: Bearer test-token' -H 'Content-Type: application/json' http://127.0.0.1:<manual-port>/api/v1/workspace/tabs -d '{"title":"Remote Root","connection_id":"<connection-id>"}'
curl -sf -H 'Authorization: Bearer test-token' http://127.0.0.1:<manual-port>/api/v1/terminal/<widget-id>
curl -sf -X POST -H 'Authorization: Bearer test-token' -H 'Content-Type: application/json' http://127.0.0.1:<manual-port>/api/v1/terminal/<widget-id>/input -d '{"text":"echo remote-e2e-ok","append_newline":true}'
npm run validate
```

Observed result:

- targeted Go tests passed for terminal, app, connections, and HTTP transport
- frontend lint passed
- frontend build passed
- the rebuilt `rterm-core` was started from a fresh state directory for manual API smoke
- a real SSH profile for `root@192.168.1.2:22` was saved, checked, selected as the default target, and used to open a remote tab
- the remote tab returned `200 OK`, produced a visible shell prompt, stayed in `status:"running"`, and accepted input
- sending `echo remote-e2e-ok` through the terminal input route succeeded and the output appeared in the buffered terminal chunks
- a saved profile with `host:"does-not-exist.invalid"` failed honestly with `500` and recorded `launch_status:"failed"` plus the hostname-resolution error
- a saved profile with `user:"definitely-no-such-user"` against `192.168.1.2` failed honestly with `500` and recorded `launch_status:"failed"` plus the SSH permission-denied error
- a saved profile with an inaccessible `identity_file` still showed `check_status:"failed"` but could still launch successfully on this machine because the local SSH environment provided other usable credentials; the shell now presents that as a warning plus a successful last-launch result, not as a fake “clean” state
- full `npm run validate` passed after the code and UI updates

What was not fully validated in this step:

- the shell connections panel was validated through live API state and compiled UI, not through browser-driven click automation
- no long-lived remote controller model was validated because the runtime still launches the local system `ssh` binary per terminal
- password-based SSH auth was not exercised because key-based auth to the reachable host already worked

## Latest connection lifecycle status-model slice

The latest remote hardening step focused only on introducing an explicit lifecycle model for connections:

- saved SSH profiles now keep separate preflight-check and launch-result state
- the runtime now distinguishes saved profile state, active default target, last check result, last launch result, and shell-visible usability
- terminal launch paths now report SSH launch success or failure back into the connection domain instead of leaving remote usability implicit

Validation executed for this step:

```bash
./scripts/go.sh test ./core/connections ./core/app ./core/terminal
```

Observed result:

- connection lifecycle tests passed
- app tests passed with the new launch-result reporting
- terminal tests still passed after the connection-aware launch-report integration

## Latest connection transport/status API slice

The latest remote hardening step focused only on exposing the new connection lifecycle state over transport:

- the connection catalog now surfaces lifecycle fields needed by the shell
- the runtime now exposes a dedicated connection preflight-check route
- connection actions were split out of the workspace action bucket in the Go app layer

Validation executed for this step:

```bash
./scripts/go.sh test ./core/connections ./core/app ./core/transport/httpapi
npm --prefix frontend run build
npm run validate
```

Observed result:

- connection, app, and HTTP transport tests passed
- frontend build still passed after the expanded connection payload shape
- full repository validation passed after the transport/API additions

## Latest remote shell lifecycle UX slice

The latest remote shell step focused only on making connection lifecycle visible and honest in the shell:

- the connections panel now renders lifecycle-oriented cards instead of plain catalog rows
- the shell now exposes the difference between “saved profile”, “default target”, “last check result”, “last launch result”, and shell-facing usability
- the frontend refreshes the connection catalog after new tab launches so launch feedback can flow back into the shell

Validation executed for this step:

```bash
./scripts/go.sh test ./core/connections ./core/app ./core/transport/httpapi
npm --prefix frontend run lint
npm --prefix frontend run build
npm run build:core
npm run validate
npm run tauri:dev
RTERM_AUTH_TOKEN=test-token apps/desktop/bin/rterm-core serve --workspace-root . --state-dir /tmp/rterm-remote-ui-smoke-clean
curl -sf -H 'Authorization: Bearer test-token' http://127.0.0.1:<manual-port>/api/v1/connections
curl -sf -X POST -H 'Authorization: Bearer test-token' -H 'Content-Type: application/json' http://127.0.0.1:<manual-port>/api/v1/connections/ssh -d '{"name":"Docs SSH","host":"example.com","user":"deploy","identity_file":"~/missing-rterm-key"}'
curl -sf -X POST -H 'Authorization: Bearer test-token' http://127.0.0.1:<manual-port>/api/v1/connections/<connection-id>/check
curl -sf -X PUT -H 'Authorization: Bearer test-token' -H 'Content-Type: application/json' http://127.0.0.1:<manual-port>/api/v1/connections/active -d '{"connection_id":"<connection-id>"}'
curl -sf http://127.0.0.1:<tauri-sidecar-port>/healthz
curl -sf http://127.0.0.1:5173
```

Observed result:

- connection, app, and transport tests passed
- frontend lint passed
- frontend build passed
- `build:core` rebuilt the sidecar binary before manual API smoke; this mattered because stale binaries can hide newly added routes
- full repository validation passed
- `tauri:dev` still launched successfully and produced a healthy loopback sidecar
- the manually started fresh sidecar returned the built-in local connection with `usability:"available"` and `runtime.check_status:"passed"`
- saving an SSH profile with a missing identity file returned `usability:"attention"` and `runtime.check_error:"identity file is not accessible"`
- explicit `POST /api/v1/connections/{id}/check` returned the same failed preflight state on the fresh binary
- selecting that SSH profile as the active connection updated only the default target; it did not imply a live SSH session

What was not fully validated in this step:

- browser-driven click smoke for the connections panel was not available because local browser automation was unavailable in this environment
- a live SSH shell against a reachable host was still not claimed as validated
- launch-result behavior beyond unit coverage was not exercised against a real SSH target

## Latest remote / SSH foundation slice

The latest parity slice focused only on the first remote / SSH foundation:

- the runtime now owns a connection catalog with explicit `local` and `ssh` entries
- SSH connection profiles can be saved and selected through dedicated transport routes
- new terminal tabs can be launched with a specific connection target
- the shell now exposes a dedicated connections surface and uses the active connection as the default target for new tabs

Validation executed for this slice:

```bash
./scripts/go.sh test ./core/connections ./core/terminal ./core/app ./core/transport/httpapi
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
npm run build:core
npm run tauri:dev
RTERM_AUTH_TOKEN=test-token ./apps/desktop/bin/rterm-core serve
curl -sf http://127.0.0.1:<sidecar-port>/healthz
curl -sf -H 'Authorization: Bearer test-token' http://127.0.0.1:<manual-port>/api/v1/connections
curl -sf -X POST -H 'Content-Type: application/json' -H 'Authorization: Bearer test-token' http://127.0.0.1:<manual-port>/api/v1/connections/ssh -d '{"name":"Parity SSH","host":"example.com","user":"dev","port":22}'
curl -sf -X PUT -H 'Content-Type: application/json' -H 'Authorization: Bearer test-token' http://127.0.0.1:<manual-port>/api/v1/connections/active -d '{"connection_id":"local"}'
curl -sf -X POST -H 'Content-Type: application/json' -H 'Authorization: Bearer test-token' http://127.0.0.1:<manual-port>/api/v1/workspace/tabs -d '{"title":"SSH Test","connection_id":"local"}'
```

Observed result:

- targeted Go tests passed for connections, terminal, app, and HTTP transport
- frontend lint passed
- frontend build passed
- full repository validation passed
- `tauri:dev` still launched the desktop shell successfully after the remote foundation changes
- `GET /healthz` on both the Tauri-launched sidecar and the manually started sidecar returned `{"status":"ok"}`
- `GET /api/v1/connections` returned the built-in local connection
- `POST /api/v1/connections/ssh` returned a persisted SSH profile in the connection catalog
- `PUT /api/v1/connections/active` updated the active connection selection
- `POST /api/v1/workspace/tabs` returned a new tab/widget snapshot using the requested connection target

What was not fully validated in this slice:

- a full live SSH shell was not claimed as validated
- the saved SSH profile was exercised as a real catalog and launch target foundation, but not as a full end-to-end remote parity flow against a reachable SSH host
- browser-driven click smoke for the new connections panel was not available in this environment

## Latest widget/app discovery parity slice

The latest parity slice focused only on richer widget/app discovery behavior derived from TideTerm:

- the shell now exposes a dedicated searchable `Launcher` section instead of relying only on the dock flyout
- launcher entries now cover new terminal tabs, AI, runtime, audit, settings/help, trust/privacy, and current widgets
- this keeps TideTerm-like “what can I open from here?” discoverability without importing the old launcher or app catalog wholesale

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
npm run tauri:dev
curl -sf http://127.0.0.1:<sidecar-port>/healthz
curl -sf http://127.0.0.1:5173
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation passed
- `tauri:dev` launched successfully and reached a running desktop binary with a fresh sidecar loopback base URL
- `GET /healthz` returned `{"status":"ok"}`
- the Vite shell entry responded successfully while the desktop shell was running

What was not fully validated in this slice:

- a browser-driven click smoke over the launcher search/cards was not available in this environment
- because of that, launcher discoverability was validated through the updated compiled shell, fresh launch path, and live sidecar readiness rather than automated UI interaction

## Latest widget/launcher parity slice

The latest parity slice focused only on widget/app/help entry behavior derived from TideTerm:

- the dock now exposes a launcher-like flyout instead of treating runtime utilities as the only cube-menu entry
- launcher entries now cover new terminal tab, AI panel, runtime utilities, audit, help, and quick widget focus
- this keeps shell discoverability closer to TideTerm without importing the old launcher or app catalog wholesale

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
npm run tauri:dev
curl -sf http://127.0.0.1:<sidecar-port>/healthz
curl -sf http://127.0.0.1:5173
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation passed
- `tauri:dev` launched successfully and reached a running desktop binary with a fresh sidecar loopback base URL
- `GET /healthz` returned `{"status":"ok"}`
- the Vite shell entry responded successfully while the desktop shell was running

What was not fully validated in this slice:

- a browser-driven click smoke over the launcher/help/widget flow was not available in this environment
- because of that, launcher discoverability was validated through shell launch readiness and the updated compiled dock surface rather than automated UI interaction

## Latest settings/control-surface parity slice

The latest parity slice focused only on shell-level settings and utility surfaces derived from TideTerm:

- the right-side dock now exposes TideTerm-shaped runtime and settings flyouts instead of generic utility chips
- the settings surface now presents `Overview`, `Trusted tools`, `Secret shield`, and `Help` views
- trust and ignore management were moved closer to user-facing settings cards instead of raw operator forms
- the audit surface now reads as a runtime trail instead of a bare event list
- policy actions were wrapped in a focused frontend hook so the root shell orchestration did not absorb more settings logic

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
npm run tauri:dev
curl -sf http://127.0.0.1:<sidecar-port>/healthz
curl -sf http://127.0.0.1:5173
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation passed
- `tauri:dev` launched successfully and reached a running desktop binary with a fresh sidecar loopback base URL
- `GET /healthz` returned `{"status":"ok"}`
- the Vite shell entry responded successfully while the desktop shell was running

What was not fully validated in this slice:

- a browser-driven click smoke over the dock/settings/audit controls was attempted but browser automation was unavailable in this environment
- because of that, the settings/control checklist was validated through launch readiness, compiled shell integrity, and live sidecar availability rather than automated UI interaction

## Latest AI panel parity slice

The latest parity slice focused only on the TideTerm-derived AI panel surface:

- welcome-state copy and layout were moved closer to TideTerm's user-facing getting-started panel
- transcript rendering was split into a dedicated message component and made more message-like
- composer copy and footer were simplified to keep the primary panel surface user-facing
- operator/settings/audit entry points were removed from the primary composer footer and left in the header menu as secondary controls

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
npm run tauri:dev
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation passed
- `tauri:dev` launched successfully and reached a running desktop binary with a fresh sidecar loopback base URL

What was not fully validated in this slice:

- a browser-driven or extension-driven manual AI panel smoke was not available in this environment
- because of that, the AI panel checklist items were validated indirectly through the compiled shell, transport/runtime integration, and existing runtime-backed panel actions, but not through automated UI interaction

## Latest workspace shell action transport hardening

The latest fix targeted `403 Forbidden` console noise when closing tabs from the shell UI:

- shell-primary workspace tab actions now use direct workspace management endpoints instead of `POST /api/v1/tools/execute`
- operator and debug tooling still uses the tool runtime path
- this preserves policy enforcement for operator actions while preventing routine shell tab interactions from failing through the tool-execution transport

Validation executed for this slice:

```bash
./scripts/go.sh test ./core/transport/httpapi ./core/app
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Additional live transport smoke:

```bash
npm run build:core
RTERM_AUTH_TOKEN=test-token apps/desktop/bin/rterm-core serve --workspace-root . --state-dir /tmp/rterm-state-tab-close-smoke
curl -X PUT /api/v1/agent/selection/mode {"id":"explore"}
curl -X DELETE /api/v1/workspace/tabs/tab-ops
curl -X POST /api/v1/tools/execute {"tool_name":"workspace.close_tab","input":{"tab_id":"tab-main"}}
```

Observed result:

- transport and app tests passed
- frontend lint passed
- frontend build passed
- full repository validation passed
- in restrictive `explore` mode, direct shell tab close returned `200 OK`
- the equivalent tool-runtime request still returned `403 Forbidden`, confirming the shell now uses the intended management path instead of the noisy operator path

## Latest terminal snapshot bootstrap hardening

The latest frontend fix targeted a terminal bootstrap crash caused by malformed or null snapshot payloads:

- terminal snapshot responses are now normalized on the client boundary before the shell consumes them
- terminal bootstrap no longer assumes `snapshot.chunks` is always present
- the terminal surface now degrades to an empty viewport on snapshot bootstrap failure instead of throwing an unhandled rejection

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation passed
- the terminal bootstrap path no longer depends on `snapshot.chunks` being present in the payload contract

## Latest console-error hardening slice

The latest fix targeted startup console noise from shell self-management requests:

- startup reads for trusted rules and ignore rules no longer go through `POST /api/v1/tools/execute`
- the shell now uses direct policy management endpoints for those read-only lists
- this removes spurious `403 Forbidden` console errors when the active role/mode/profile strips policy capabilities from tool execution

Validation executed for this slice:

```bash
./scripts/go.sh test ./core/transport/httpapi
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- transport tests passed, including the new auth + payload coverage for policy list endpoints
- frontend lint passed
- frontend build passed
- full repository validation passed

Additional launch/console smoke validation:

```bash
npm run build:core
RTERM_AUTH_TOKEN=test-token apps/desktop/bin/rterm-core serve --workspace-root . --state-dir /tmp/rterm-state-console-check
VITE_RTERM_API_BASE=http://127.0.0.1:<port> VITE_RTERM_AUTH_TOKEN=test-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4174 --strictPort
node /tmp/.../check.mjs
```

Observed result:

- a fresh `rterm-core` binary was required for the new management endpoints to be present
- after rebuilding the sidecar and restarting the dev server, the browser-backed smoke reported:
  - `errors: []`
  - `badResponses: []`
  - terminal shell present on the page
- startup no longer emitted `403 Forbidden` requests for policy list loading in the browser console

## Latest AI panel parity slice

The latest parity slice focused on the TideTerm-derived AI panel only:

- welcome-state grammar moved closer to TideTerm
- transcript cards became more readable and less operator-first
- mode/profile/role controls stayed visible but moved into a tighter top strip
- composer moved toward TideTerm-style inline attach/send affordances
- operator links were demoted from the primary composer surface

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
npm run tauri:dev
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation passed
- `tauri:dev` still launched the desktop shell and fresh sidecar successfully

Additional browser-backed AI panel smoke validation:

```bash
npm run build:core
RTERM_AUTH_TOKEN=test-token apps/desktop/bin/rterm-core serve --workspace-root . --state-dir /tmp/rterm-state-ai-smoke
VITE_RTERM_API_BASE=http://127.0.0.1:<port> VITE_RTERM_AUTH_TOKEN=test-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4176 --strictPort
node /tmp/.../check-ai-panel.mjs
```

Smoke checklist covered:

- app shell loads with the AI panel visible
- welcome state renders
- quick action still works
- mode/profile/role controls still work
- composer submits a runtime-backed prompt
- transcript renders the resulting messages
- approval banner becomes visible after a dangerous operator action

Observed result:

- `welcomeVisible: true`
- `transcriptHasInspect: true`
- `transcriptHasTabs: true`
- `approvalVisible: true`
- `panelVisible: true`
- `composerVisible: true`

Console/network note:

- no unexpected console or page errors were observed during normal AI panel use
- the browser-backed smoke still records an expected `428 Precondition Required` entry when a dangerous tool intentionally triggers the approval flow through `POST /api/v1/tools/execute`
- this is currently an explicit transport tradeoff, not a hidden failure; the UI handled it correctly and showed the approval banner

## Latest terminal stream lifecycle hardening

The latest runtime fix targeted noisy terminal stream reconnect errors:

- terminal subscribers now stay open after normal process exit instead of being closed as if the widget disappeared
- the frontend `EventSource` now stops automatic retry on stream failure instead of retrying indefinitely and spamming the console

Validation executed for this slice:

```bash
./scripts/go.sh test ./core/terminal
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- terminal tests passed, including the new subscriber-lifecycle coverage
- frontend lint passed
- frontend build passed
- full repository validation passed

Additional browser-backed stream smoke:

```bash
npm run build:core
RTERM_AUTH_TOKEN=test-token apps/desktop/bin/rterm-core serve --workspace-root . --state-dir /tmp/rterm-state-stream-smoke
VITE_RTERM_API_BASE=http://127.0.0.1:<port> VITE_RTERM_AUTH_TOKEN=test-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4177 --strictPort
node /tmp/.../check-terminal-stream-exit.mjs
```

Observed result:

- terminal shell loaded successfully
- no `Could not connect to the server` console errors were observed
- no failing `/stream` responses were observed during the smoke run

## Frontend baseline import validation

The parity-first frontend import path was exercised directly:

```bash
npm run import:tideterm-frontend
npm --prefix frontend run lint
npm --prefix frontend run build
```

Observed result:

- the TideTerm renderer source was copied into `frontend/tideterm-src/`
- TideTerm renderer build metadata was copied into `frontend/tideterm-src-meta/`
- frontend lint still passed because the imported baseline is intentionally ignored by the current lint config
- frontend build still passed, confirming the literal source import does not break the current runnable shell

## Latest parity slice

The latest product-parity slice focused on TideTerm-derived shell behavior:

- top tab-strip shell retained as the primary navigation surface
- AI panel moved onto a persisted left-side resizable panel model
- terminal stage kept as the center surface
- right side constrained to a slim dock instead of a primary control column

Validation executed for this slice:

```bash
npm --prefix frontend install
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- the new frontend dependency set installed successfully
- frontend lint passed
- frontend build passed
- full repository validation still passed after the shell/layout refactor

What was not revalidated in this slice:

- `npm run tauri:dev` was not re-run after the parity-shell refactor
- no fresh UI automation run was performed after this specific shell/layout pass

## Latest AI panel parity slice

The next frontend parity slice focused on bringing the left AI panel back toward the TideTerm interaction grammar:

- TideTerm-shaped AI panel header retained as the primary panel chrome
- widget-context toggle restored as a first-class control
- primary `agent` view moved from settings-first forms to a message-like panel surface
- profile / role / mode controls moved into a bottom dock instead of dominating the panel body
- tools / settings / audit remained available as secondary views inside the same shell

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation still passed after the AI panel refactor

What was not revalidated in this slice:

- `npm run tauri:dev` was not re-run after this specific AI panel refactor
- no fresh manual UI smoke or screenshot diff was executed after this specific panel pass

## Latest widget rail parity slice

The following shell pass restored the TideTerm hierarchy on the right side of the workspace:

- the right rail is widget-first again
- widget focus actions moved back into the main rail stack
- tools / settings / audit were demoted to footer utilities instead of acting like the primary right-side content model

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
```

Observed result:

- frontend lint passed
- frontend build passed

Additional follow-up validation:

```bash
npm run validate
```

Observed result:

- full repository validation passed after the rail adjustment as well

What was not revalidated in this slice:

- no fresh UI automation or manual Tauri launch was performed for this rail-only shell adjustment

## Latest tab-shell parity slice

The next shell pass moved the top workspace header closer to TideTerm's tabbar composition:

- workspace switcher-style control restored on the left
- tabs remained in the center strip
- AI control was moved into the right-side cluster instead of staying in a separate summary block

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
```

Observed result:

- frontend lint passed
- frontend build passed

Additional follow-up validation:

```bash
npm run validate
```

Observed result:

- full repository validation passed after the top-bar shell adjustment as well

What was not revalidated in this slice:

- no fresh UI automation or manual Tauri launch was performed for this top-bar-only shell adjustment

## Latest workspace tab-model parity slice

The next parity pass introduced a real tab domain into the new workspace model:

- workspace snapshots now include `tabs` and `active_tab_id`
- the runtime exposes `workspace.list_tabs`, `workspace.get_active_tab`, and `workspace.focus_tab`
- focusing a tab synchronizes the active widget
- the top shell now renders runtime tabs instead of reusing widgets as fake tabs

Validation executed for this slice:

```bash
./scripts/go.sh test ./core/workspace ./core/app
npm --prefix frontend run lint
npm --prefix frontend run build
```

Observed result:

- workspace and app-layer tab tests passed
- frontend lint passed
- frontend build passed

Additional follow-up validation:

```bash
npm run validate
```

Observed result:

- full repository validation passed after introducing the tab model

What was not revalidated in this slice:

- no fresh UI automation or manual Tauri launch was performed after this specific tab-domain pass

## Latest tab-controls parity slice

The next workspace parity pass added basic TideTerm-style tab controls:

- top shell can create a new terminal tab
- top shell can close an existing tab
- closing a tab tears down the associated terminal session
- the runtime prevents closing the last remaining tab

Validation executed for this slice:

```bash
./scripts/go.sh test ./core/workspace ./core/terminal ./core/app
npm --prefix frontend run lint
npm --prefix frontend run build
```

Observed result:

- workspace, terminal, and app-layer tests passed
- frontend lint passed
- frontend build passed

Additional follow-up validation:

```bash
npm run validate
```

Observed result:

- full repository validation passed after the tab-controls slice

What was not revalidated in this slice:

- no fresh UI automation or manual Tauri launch was performed after this specific create/close-tab pass

## Latest tab-rename-and-pin parity slice

The next workspace parity pass extended the top strip toward real TideTerm tab behavior:

- tabs can now be renamed inline in the top strip
- tabs can now be pinned and unpinned from the top strip
- pinned tabs render before regular tabs
- the runtime exposes `workspace.rename_tab` and `workspace.set_tab_pinned`
- workspace and app-layer tests now cover rename and pin flows

Validation executed for this slice:

```bash
./scripts/go.sh test ./core/workspace ./core/app
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- targeted workspace and app-layer tests passed
- frontend lint passed
- frontend build passed
- full repository validation passed after the tab rename/pin slice

What was not revalidated in this slice:

- no fresh UI automation was run after the inline rename/pin change
- no fresh manual Tauri launch was performed after this specific top-strip interaction pass

## Latest tab-reorder parity slice

The next workspace parity pass extended the tabbar toward TideTerm reorder behavior:

- the runtime now exposes `workspace.move_tab`
- tabs can be drag-reordered inside their current pinned or regular group
- cross-group drag between pinned and regular tabs is rejected by the workspace domain
- workspace and app-layer tests now cover tab move flows

Validation executed for this slice:

```bash
./scripts/go.sh test ./core/workspace ./core/app
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- targeted workspace and app-layer tests passed
- frontend lint passed
- frontend build passed
- full repository validation passed after the tab reorder slice

What was not revalidated in this slice:

- no fresh UI automation was run after the drag-reorder change
- no fresh manual Tauri launch was performed after this specific tabbar interaction pass

## Latest tab-context-menu parity slice

The next tabbar parity pass added a TideTerm-style context menu to each tab:

- right-click on a tab now opens a context menu
- the context menu exposes pin/unpin, rename, and close actions
- the menu is wired to the existing runtime-backed tab actions instead of introducing frontend-only state

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation passed after the tab context-menu slice

What was not revalidated in this slice:

- no fresh UI automation was run after adding the context menu
- no fresh manual Tauri launch was performed after this specific tab menu pass

## Latest workspace-switcher parity slice

The next shell parity pass restored a TideTerm-shaped workspace-switcher entry point:

- the top-left workspace button now opens a workspace popover
- the popover shows the active workspace, repository root, active tab, and active widget
- the popover provides a shell-level `New terminal tab` action
- multi-workspace switching is still explicitly pending and is not faked in the frontend

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation passed after the workspace-switcher slice

What was not revalidated in this slice:

- no fresh UI automation was run after the workspace-switcher popover change
- no fresh manual Tauri launch was performed after this specific shell-control pass

## Latest widget-dock control parity slice

The next shell parity pass moved the right-side dock closer to TideTerm control behavior:

- widget dock footer actions now open flyout menus instead of acting like raw section toggles
- runtime and settings entry points stay shell-level and route into existing operator/policy surfaces
- the dock remains a secondary control surface instead of becoming another primary content column

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation passed after the widget-dock control slice

What was not revalidated in this slice:

- no fresh UI automation was run after the dock flyout change
- no fresh manual Tauri launch was performed after this specific widget-dock pass

## Latest AI-header parity slice

The next AI-panel parity pass restored TideTerm header grammar:

- the AI panel header now uses a TideTerm-shaped title row
- widget context toggle stays in the header
- section switching moved into a kebab overflow menu instead of a custom pill strip
- AI section routing still targets the current runtime, policy, and audit surfaces

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation passed after the AI-header slice

What was not revalidated in this slice:

- no fresh UI automation was run after the AI header/menu change
- no fresh manual Tauri launch was performed after this specific AI-panel shell pass

## Latest AI-mode-strip parity slice

The next AI-panel parity pass moved posture controls closer to TideTerm message flow:

- prompt profile, role preset, and work mode selectors now render in a top mode strip above the message feed
- the footer is now reserved for shell-level actions instead of carrying the full posture form
- this keeps the current runtime-backed controls while aligning panel composition with TideTerm

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation passed after the AI mode-strip slice

What was not revalidated in this slice:

- no fresh UI automation was run after moving the posture controls
- no fresh manual Tauri launch was performed after this specific AI-panel layout pass

## Latest AI-quick-actions parity slice

The next AI-panel parity pass added working quick actions inside the AI feed:

- the AI welcome card now exposes `Inspect terminal`, `List tabs`, and `Open audit`
- these actions call the current runtime and section surfaces instead of introducing frontend-only behavior
- this is the current closest-compatible interaction layer until a real conversation backend lands

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation passed after the AI quick-actions slice

What was not revalidated in this slice:

- no fresh UI automation was run after adding the quick actions
- no fresh manual Tauri launch was performed after this specific AI-panel action pass

## Latest AI-transcript parity slice

The next AI-panel parity pass moved the panel closer to TideTerm's message flow:

- the welcome state is now a single TideTerm-shaped AI message instead of multiple static status cards
- runtime-backed quick actions, approval confirmations, and profile/role/mode updates now append into a persistent AI activity transcript
- the transcript auto-scrolls like a message feed and distinguishes user-side versus assistant-side entries
- this remains a closest-compatible equivalent until a real conversation backend is wired in

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation passed after the AI transcript slice

What was not revalidated in this slice:

- no fresh UI automation was run after introducing the transcript behavior
- no fresh manual Tauri launch was performed after this specific AI-panel transcript pass

## Latest AI-composer parity slice

The next AI-panel parity pass added a TideTerm-shaped footer composer with explicit MVP semantics:

- the AI panel now accepts prompt input through a textarea composer instead of only quick-action buttons
- supported prompts map onto real runtime actions such as terminal inspection, tab listing, widget listing, active-tab lookup, and terminal interrupt
- unsupported prompts produce an explicit assistant-side fallback instead of pretending a full conversation backend exists

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation passed after the AI composer slice

What was not revalidated in this slice:

- no fresh UI automation was run after adding the composer behavior
- no fresh manual Tauri launch was performed after this specific AI-panel composer pass

## Latest AI tool-rendering parity slice

The next AI-panel parity pass made the runtime-backed transcript behave more like a working TideTerm AI/tool feed:

- transcript entries now render explicit tool-use rows instead of only generic text cards
- runtime responses expose operation summaries, affected widgets, affected paths, approval tiers, and approval-use markers in the AI feed
- this improves parity with TideTerm's message-plus-tool surface without porting the old AI/backend coupling

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation passed after the AI tool-rendering slice

What was not revalidated in this slice:

- no fresh UI automation was run after enriching transcript rendering
- no fresh manual Tauri launch was performed after this specific AI-panel rendering pass

## Latest AI composer-controls parity slice

The next AI-panel parity pass moved the composer closer to TideTerm's input surface:

- the composer now exposes attach, send, and prompt-chip affordances instead of a bare textarea
- prompt chips route into the same runtime-backed action path as typed prompts
- the attach button is present for parity but reports an explicit MVP gap because file attachment transport is not implemented yet

Validation executed for this slice:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
```

Observed result:

- frontend lint passed
- frontend build passed
- full repository validation passed after the composer-controls slice

What was not revalidated in this slice:

- no fresh UI automation was run after adding the attach/prompt-chip affordances
- no fresh manual Tauri launch was performed after this specific AI-panel input-control pass

## Latest terminal-parity slice

The next controlled parity slice focused only on terminal UX behavior derived from TideTerm:

- the terminal surface moved from a large custom card toward a compact term shell with a tighter header and toolbar/status strip
- the frontend now hydrates terminal scrollback from a JSON snapshot before opening the SSE stream, so remounting the terminal no longer starts from an empty live tail
- terminal focus, refresh, interrupt, visible scrollback, and compact paste/send fallback controls were reworked as a single TideTerm-derived shell slice
- `useRuntimeShell.ts` was cut back by moving bootstrap and terminal-state concerns into focused hooks instead of letting the shell orchestrator keep growing

Validation executed for this slice:

```bash
npm --prefix frontend run lint
./scripts/go.sh test ./core/transport/httpapi ./core/terminal ./core/app
npm run validate
npm run tauri:dev
curl http://127.0.0.1:<runtime-port>/healthz
```

Observed result:

- frontend lint passed
- targeted Go tests passed, including the new terminal snapshot transport test
- full repository validation passed
- `npm run tauri:dev` launched the desktop shell successfully and the Go sidecar reported a live loopback base URL
- the sidecar health endpoint returned `{"status":"ok"}`

What was not fully validated in this slice:

- no browser automation was completed against the live terminal shell because Browser MCP was unavailable and the local Playwright browser bundle was not installed in this environment
- no packaged `tauri build` was run
- no Linux terminal shell validation was performed

## Tooling baseline

- Go: `go1.26.2 darwin/arm64`
- Node: `v24.14.1`
- npm: `11.11.0`
- Rust: stable toolchain with `cargo`
- Tauri CLI: local npm package `@tauri-apps/cli` `2.10.1`

## Build and test validation

The following commands completed successfully:

```bash
npm install
npm --prefix frontend install
npm run build:core
npm run validate
```

`npm run validate` expands to:

```bash
npm run lint:frontend
npm run build:frontend
npm run test:go
npm run build:go
npm run tauri:check
```

Observed results:

- frontend lint passed
- frontend production build passed
- Go tests passed for `./cmd/... ./core/... ./internal/...`
- Go package build passed
- `build:core` emitted `apps/desktop/bin/rterm-core`
- `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml` passed

Notable correctness coverage now exercised by Go tests:

- concurrent `terminal.StartSession` coalesces to one launch
- unsubscribe/output delivery does not panic under concurrent delivery and channel close
- pending approvals are consumed by `safety.confirm`
- approval grants are one-time and cannot be replayed
- `term.interrupt` executes against the active terminal widget and returns a structured result
- policy table tests cover ignore precedence, trusted matching, allowed roots, approval escalation, destructive handling, and capability overlays

## Launch validation

The documented launch path was exercised directly:

```bash
npm run build:core
npm run tauri:dev
```

Observed launch behavior:

- `npm run tauri:dev` used `./scripts/tauri-dev.sh`
- the wrapper performed fail-fast checks for `npm`, `cargo`, `curl`, macOS CLT, frontend dependencies, local npm Tauri CLI, and the built Go core binary
- the Tauri development build completed successfully
- the desktop binary was started successfully:

```text
Finished `dev` profile [unoptimized + debuginfo] target(s) in 37.11s
Running `target/debug/rterm-desktop`
{"base_url":"http://127.0.0.1:51312","pid":12665}
```

The launch was then interrupted manually after confirming that the desktop shell and Go sidecar reached the running state.

## Runtime smoke validation

The built Go runtime was started directly and exercised over the real HTTP API with auth enabled:

```bash
RTERM_AUTH_TOKEN=test-token ./apps/desktop/bin/rterm-core serve \
  --listen 127.0.0.1:0 \
  --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal \
  --state-dir <tmp>/state \
  --ready-file <tmp>/ready.json
```

Validated slice:

- `GET /api/v1/agent`
- `PUT /api/v1/agent/selection/mode`
- `term.get_state`
- dangerous policy mutation returning `428 approval_required`
- `safety.confirm`
- one-time approval token consumption

Observed runtime results:

- agent catalog endpoint responded successfully
- mode updates via the management API succeeded
- `term.get_state` succeeded for `term-main`
- dangerous `safety.add_ignore_rule` returned `428`
- `safety.confirm` returned an approval token
- the approved mutation succeeded once with `200`
- replaying the same approval token returned `428`, confirming single-use approval grants

## UI smoke validation

The browser-hosted frontend was exercised against a real loopback `rterm-core` instance using explicit runtime environment variables:

```bash
RTERM_AUTH_TOKEN=test-token ./apps/desktop/bin/rterm-core serve \
  --listen 127.0.0.1:0 \
  --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal \
  --state-dir <tmp>/state \
  --ready-file <tmp>/ready.json

VITE_RTERM_API_BASE=http://127.0.0.1:<port> \
VITE_RTERM_AUTH_TOKEN=test-token \
  npm --prefix frontend run dev -- --host 127.0.0.1 --port 4173 --strictPort
```

The UI itself was then driven by a local temporary Playwright install outside the repository so project dependencies were not modified.

Validated interaction slice:

- load the shell UI and bootstrap the live terminal surface
- switch prompt profile, role preset, and work mode through the visible selectors
- send terminal input through the xterm keyboard path and observe echoed output
- execute `safety.add_ignore_rule` from the operator panel with a manual JSON payload
- observe `approval required`, confirm the action, and see the success path complete
- verify the audit tail shows the tool event and `approval used`
- interrupt the active terminal session from the visible interrupt action

Observed result:

```json
{
  "ok": true,
  "steps": [
    "load app",
    "switch profile/role/mode",
    "send terminal input through xterm keyboard path",
    "trigger approval through operator panel",
    "return profile to balanced for operator actions",
    "interrupt active terminal"
  ]
}
```

## What was not validated

- no full packaged `tauri build` was run
- no Linux launch path was exercised in this pass
- no native-window automation was run inside the Tauri shell; launch readiness was validated with `npm run tauri:dev`, and UI interactions were validated against the browser-hosted frontend connected to the same Go runtime
- `cargo fmt` was not run because `rustfmt` is not installed in the local Rust toolchain

## Latest terminal parity hardening slice

This slice stayed intentionally narrow:

- terminal chrome moved closer to TideTerm header + toolbar + command-strip composition
- visible live-tail state and viewport affordances were added to the terminal surface
- shell hook responsibilities were reduced by moving policy-list state and agent-feed state out of `useRuntimeShell.ts`
- workspace payload normalization was kept at the API boundary so terminal shell code no longer crashes on incomplete workspace snapshots

Validation executed for this slice:

```bash
npm run build:core
npm --prefix frontend run lint
npm --prefix frontend run build
npm run validate
npm run tauri:dev
curl http://127.0.0.1:<runtime-port>/healthz
```

Observed result:

- `build:core` refreshed `apps/desktop/bin/rterm-core` before terminal-specific smoke
- frontend lint passed
- frontend build passed
- full repository validation passed
- `npm run tauri:dev` launched the desktop shell and printed a live sidecar base URL
- the sidecar responded successfully on `/healthz`

Terminal-focused smoke validated in this slice:

- app launch path still works after terminal-shell changes
- terminal surface is present inside the shell
- terminal focus works
- keyboard input reaches the PTY
- output is present in terminal snapshots after typed commands
- snapshot hydration works against the refreshed sidecar binary
- toolbar actions remain wired in the running app path
- follow/jump behavior changes state when the viewport is scrolled off the live tail
- no frontend console or page errors were observed in the fresh browser-backed smoke run

What was not fully automated in this slice:

- no native-window automation was run inside the Tauri shell itself
- browser-backed smoke was run against the Vite-hosted frontend pointed at a real `rterm-core` sidecar, which is sufficient for this terminal slice because the terminal behavior lives in the shared renderer/runtime path

## Latest frontend stabilization slice 2 validation

This slice stayed intentionally narrow:

- TypeScript/build convergence on active frontend paths
- runtime/bootstrap truthfulness for browser-hosted Vite validation
- no CSS or visual refactor work

Validation executed for this slice:

```bash
npx tsc -p frontend/tsconfig.json --noEmit
npm --prefix frontend run build
npm --prefix frontend run lint
RTERM_AUTH_TOKEN=test-token go run ./cmd/rterm-core serve -listen 127.0.0.1:52732 -state-dir /tmp/runa-slice2-state -workspace-root . -ready-file /tmp/runa-slice2-ready.json
VITE_RTERM_API_BASE=http://127.0.0.1:52732 VITE_RTERM_AUTH_TOKEN=test-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 5173 --strictPort
curl -sf http://127.0.0.1:52732/healthz
curl -sf -H 'Authorization: Bearer test-token' http://127.0.0.1:52732/api/v1/bootstrap
curl -sf -H 'Authorization: Bearer test-token' http://127.0.0.1:52732/api/v1/workspace
curl -sf -H 'Authorization: Bearer test-token' http://127.0.0.1:52732/api/v1/terminal/term-main?from=0
curl -sf -X POST -H 'Authorization: Bearer test-token' -H 'Content-Type: application/json' http://127.0.0.1:52732/api/v1/terminal/term-main/input -d '{"text":"echo slice2-runtime-ok","append_newline":true}'
```

Observed result:

- `tsc` passes.
- frontend production build passes; warnings remain for Tailwind v4 at-rules in Lightning CSS, browser-externalized electron modules, and large chunks.
- frontend lint still fails with a large legacy backlog concentrated in AI/block/layout/util/type zones.
- backend serve path starts and responds on `127.0.0.1:52732`.
- browser-hosted frontend now loads without console errors and issues real typed API requests to:
  - `GET /healthz`
  - `GET /api/v1/bootstrap`
  - `GET /api/v1/workspace`
  - `GET /api/v1/terminal/term-main?from=0`
- the browser requests include `Authorization: Bearer test-token` on authenticated endpoints.
- sending `echo slice2-runtime-ok` through `POST /api/v1/terminal/term-main/input` succeeded, and the subsequent terminal snapshot contained `slice2-runtime-ok`.

What was not validated in this slice:

- no full Electron/Tauri interactive UI automation was run
- the legacy Wave/WOS renderer path was not revived in plain browser mode; browser dev now uses a narrow typed-runtime validation fallback instead

## Latest terminal action pipeline stabilization (Slice 4)

This slice stayed intentionally narrow:

- explicit active-path terminal action model documentation
- centralized active terminal action entrypoints in `old_front` (`submit input`, `interrupt`, approval confirm/retry)
- honest interrupt/approval/audit validation evidence without scope expansion

Validation executed for this slice:

```bash
npm run check:active-path-api
npx tsc -p frontend/tsconfig.json --noEmit
npm --prefix frontend run build

RTERM_AUTH_TOKEN=test-token ./apps/desktop/bin/rterm-core serve \
  --listen 127.0.0.1:0 \
  --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal \
  --state-dir /tmp/rterm-slice4-yEFjTa/state \
  --ready-file /tmp/rterm-slice4-yEFjTa/ready.json

curl -sS http://127.0.0.1:61384/healthz
curl -sS -H 'Authorization: Bearer test-token' http://127.0.0.1:61384/api/v1/bootstrap
curl -sS -H 'Authorization: Bearer test-token' http://127.0.0.1:61384/api/v1/workspace

# terminal input path
curl -sS -H 'Authorization: Bearer test-token' -H 'Content-Type: application/json' \
  -X POST http://127.0.0.1:61384/api/v1/terminal/term-main/input \
  -d '{"text":"echo slice4-input-http","append_newline":true}'
curl -sS -H 'Authorization: Bearer test-token' \
  'http://127.0.0.1:61384/api/v1/terminal/term-main?from=4'

# interrupt path
curl -sS -H 'Authorization: Bearer test-token' -H 'Content-Type: application/json' \
  -X POST http://127.0.0.1:61384/api/v1/tools/execute \
  -d '{"tool_name":"term.send_input","input":{"widget_id":"term-main","text":"sleep 15","append_newline":true},"context":{"workspace_id":"ws-local","repo_root":"/Users/avm/projects/Personal/tideterm/runa-terminal","active_widget_id":"term-main"}}'
curl -sS -H 'Authorization: Bearer test-token' -H 'Content-Type: application/json' \
  -X POST http://127.0.0.1:61384/api/v1/tools/execute \
  -d '{"tool_name":"term.interrupt","input":{"widget_id":"term-main"},"context":{"workspace_id":"ws-local","repo_root":"/Users/avm/projects/Personal/tideterm/runa-terminal","active_widget_id":"term-main"}}'
curl -sS -H 'Authorization: Bearer test-token' -H 'Content-Type: application/json' \
  -X POST http://127.0.0.1:61384/api/v1/tools/execute \
  -d '{"tool_name":"term.get_state","input":{"widget_id":"term-main"},"context":{"workspace_id":"ws-local","repo_root":"/Users/avm/projects/Personal/tideterm/runa-terminal","active_widget_id":"term-main"}}'

# approval path
curl -sS -H 'Authorization: Bearer test-token' -H 'Content-Type: application/json' \
  -X POST http://127.0.0.1:61384/api/v1/tools/execute \
  -d '{"tool_name":"safety.add_ignore_rule","input":{"scope":"repo","matcher_type":"glob","pattern":"slice4-approval-*","mode":"metadata-only","note":"slice4 validation"},"context":{"workspace_id":"ws-local","repo_root":"/Users/avm/projects/Personal/tideterm/runa-terminal","active_widget_id":"term-main"}}'
curl -sS -H 'Authorization: Bearer test-token' -H 'Content-Type: application/json' \
  -X POST http://127.0.0.1:61384/api/v1/tools/execute \
  -d '{"tool_name":"safety.confirm","input":{"approval_id":"approval_9ae9da7f5019c00c"},"context":{"workspace_id":"ws-local","repo_root":"/Users/avm/projects/Personal/tideterm/runa-terminal","active_widget_id":"term-main"}}'
curl -sS -H 'Authorization: Bearer test-token' -H 'Content-Type: application/json' \
  -X POST http://127.0.0.1:61384/api/v1/tools/execute \
  -d '{"tool_name":"safety.add_ignore_rule","input":{"scope":"repo","matcher_type":"glob","pattern":"slice4-approval-*","mode":"metadata-only","note":"slice4 validation"},"approval_token":"d0d38151cf81593d35ddb32bec6d0213","context":{"workspace_id":"ws-local","repo_root":"/Users/avm/projects/Personal/tideterm/runa-terminal","active_widget_id":"term-main"}}'
```

Observed result:

- `check:active-path-api` passed.
- `tsc` passed.
- frontend build passed (warnings remained for Lightning CSS/Tailwind at-rules and chunk size).
- `/healthz`, `/api/v1/bootstrap`, and `/api/v1/workspace` responded successfully from live runtime.
- terminal input endpoint accepted input and snapshot output contained `slice4-input-http`.
- `term.interrupt` returned structured `status:"ok"` with `interrupted:true`, and interrupt events were visible in audit.
- immediate cancellation of a long-running `sleep 15` command was not consistently observable in this run; interrupt effectiveness remains a known limitation.
- dangerous `safety.add_ignore_rule` produced `requires_confirmation`; `safety.confirm` returned a one-time approval token; retry with token succeeded; replaying the consumed token returned `requires_confirmation` again.
- audit stream included:
  - failed dangerous call with `error:"approval_required"`
  - successful `safety.confirm`
  - approved retry with `approval_used:true`
