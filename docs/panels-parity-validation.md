# Panels Parity Validation

Date: `2026-04-17`
Validation mode: `headed / visible browser`

This validation used the repo-root Tide sources as the behavior reference and exercised the active compat shell in a live runtime.

## Tide source files checked against visible behavior

- `tideterm/frontend/app/aipanel/aipanel.tsx`
- `tideterm/frontend/app/aipanel/aipanelheader.tsx`
- `tideterm/frontend/app/aipanel/aipanelmessages.tsx`
- `tideterm/frontend/app/aipanel/aipanelinput.tsx`
- `tideterm/frontend/app/aipanel/aimode.tsx`
- `tideterm/frontend/app/workspace/widgets.tsx`
- `tideterm/frontend/app/view/waveconfig/waveconfig.tsx`
- `tideterm/frontend/app/view/waveconfig/settingscontent.tsx`
- `tideterm/frontend/app/view/waveconfig/secretscontent.tsx`
- `tideterm/frontend/app/view/helpview/helpview.tsx`

## Exact headed flow used

1. Started an isolated local model stub (`Ollama`-compatible HTTP server) so the AI panel could complete real request/response flow without external services.
2. Started `rterm-core` with:
   - `RTERM_AUTH_TOKEN=panels-parity-validation-token`
   - `RTERM_OLLAMA_BASE_URL=http://127.0.0.1:11469`
   - `RTERM_OLLAMA_MODEL=panels-test-model`
3. Started the frontend dev server with:
   - `VITE_RTERM_API_BASE=http://127.0.0.1:61268`
   - `VITE_RTERM_AUTH_TOKEN=panels-parity-validation-token`
4. Opened headed Chromium visibly at `http://127.0.0.1:4312/`.
5. Opened the right-rail settings surface and switched through:
   - `Overview`
   - `Trusted tools`
   - `Secret shield`
   - `Help`
6. Closed settings and exercised the AI panel directly:
   - toggled widget context `ON -> OFF -> ON`
   - switched mode `Implement -> Review -> Implement`
   - submitted a normal message and waited for a visible assistant response from the stub model
   - submitted `/run echo panels-parity-1776440664704`
   - waited for the execution block to render
   - clicked `Explain` and waited for the explain transcript entry

## What was visibly verified

- The settings surface opens from the right dock as a bounded secondary flyout, not as a primary shell takeover.
- The settings surface stayed inside the visible viewport during the headed run:
  - viewport: `1440x900`
  - settings surface box: `x=977`, `y=215`, `width=416`, `height=672`
- All required settings views rendered on the active compat path:
  - `Overview`
  - `Trusted tools`
  - `Secret shield`
  - `Help`
- The AI panel remained left-anchored and filled the panel region:
  - AI panel box: `x=0`, `y=37`, `width=300`, `height=863`
- The widget-context control was real on the compat path:
  - visible title changed from `Widget Access ON` to `Widget Access OFF` and back to `Widget Access ON`
- The compat mode strip was visibly present on the welcome state and accepted explicit mode changes:
  - `Review` selected successfully
  - switched back to `Implement` for the `/run` path
- Plain message flow worked in the visible panel with a real rendered assistant reply from the stub provider.
- Structured execution remained intact after the panel changes:
  - `/run echo panels-parity-1776440664704` rendered an execution block
  - `Explain` produced the expected transcript entry for that block
- No overlap or anchor regression was observed between the AI panel and the right-rail settings flyout.

## Remaining mismatch

- `Trusted tools` and `Secret shield` are closest-compatible shell utility views backed by runtime policy APIs; Tide does not expose literal equivalent tabs in the inspected source files.
- The compat mode strip scrolls with the transcript container after message flow moves the panel to the latest content. This matches the inspected Tide message structure, where the mode control sits inside the scrollable transcript region instead of remaining pinned.

## Headed note

This validation was run in a headed, visible Chromium session, not in hidden/headless mode.
