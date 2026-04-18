# UI System Audit

Date: `2026-04-17`

This audit compares the active frontend UI system against the Tide reference sources in the repository root.

Repo-root Tide sources were used as the primary reference for this audit.

## Tide sources inspected

- `tideterm/index.html`
- `tideterm/frontend/wave.ts`
- `tideterm/frontend/util/fontutil.ts`
- `tideterm/frontend/app/app.tsx`
- `tideterm/frontend/app/app.scss`
- `tideterm/frontend/app/theme.scss`
- `tideterm/frontend/tailwindsetup.css`
- `tideterm/frontend/app/element/modal.tsx`
- `tideterm/frontend/app/element/modal.scss`
- `tideterm/frontend/app/element/popover.tsx`
- `tideterm/frontend/app/element/popover.scss`
- `tideterm/frontend/app/view/waveconfig/waveconfig.tsx`
- `tideterm/public/fonts/*`
- `tideterm/public/fontawesome/css/*`
- `tideterm/public/fontawesome/webfonts/*`
- `tideterm/public/logos/*`

## Current frontend files inspected

- `frontend/index.html`
- `frontend/vite.config.ts`
- `frontend/wave.ts`
- `frontend/util/fontutil.ts`
- `frontend/app/app.tsx`
- `frontend/app/app.scss`
- `frontend/app/theme.scss`
- `frontend/tailwindsetup.css`
- `frontend/app/fontawesome.css`
- `frontend/app/element/modal.tsx`
- `frontend/app/element/modal.scss`
- `frontend/app/workspace/settings-floating-window.tsx`
- `frontend/app/workspace/settings-utility-surface.tsx`
- `frontend/app/workspace/utility-surface-frame.tsx`
- `frontend/app/workspace/widgets.tsx`
- `frontend/assets/fonts/*`
- `frontend/assets/fontawesome/css/*`
- `frontend/assets/fontawesome/webfonts/*`
- `frontend/assets/logos/*`
- `frontend/assets/style.scss`

## Duplicate font sets

- `frontend/app/theme.scss` declares `@font-face` rules for `Inter` and `Hack`.
- `frontend/util/fontutil.ts` still carries the Tide runtime font loader for `Inter`, `Hack`, and `JetBrains Mono`.
- `frontend/vite.config.ts` replaces `@/util/fontutil` with a no-op stub, so the current app keeps a second font system in source while disabling the Tide one at runtime.
- `frontend/assets/fonts/` contains two parallel mono families for the same semantic role:
  - Tide-consistent files: `inter-variable.woff2`, `jetbrains-mono-v13-latin-*`, `hacknerdmono-*`
  - extra drift files: `Inter-Variable-Latin.woff2`, `JetBrainsMono-Regular.woff2`, `JetBrainsMono-Medium.woff2`, `JetBrainsMono-Bold.woff2`
- `frontend/package.json` still includes `@fontsource/jetbrains-mono` and `@fontsource/space-grotesk`, but the active frontend does not use them.

Reference mismatch:

- Tide uses one font path: `tideterm/frontend/wave.ts` calls `loadFonts()` from `tideterm/frontend/util/fontutil.ts`, and those files load from `tideterm/public/fonts/*`.
- Tide does not define duplicate `@font-face` blocks in `tideterm/frontend/app/theme.scss`.

## Conflicting style sources

- `frontend/app/theme.scss` diverges from `tideterm/frontend/app/theme.scss` by redefining font faces and by widening fallback stacks in `--base-font` and `--fixed-font`.
- `frontend/tailwindsetup.css` also diverges from `tideterm/frontend/tailwindsetup.css` by adding extra fallback stacks for `--font-sans` and `--font-mono`.
- `frontend/app/app.tsx` imports `./fontawesome.css`, while Tide loads Font Awesome statically from `tideterm/index.html`.
- `frontend/assets/style.scss` duplicates the older Tide public stylesheet shape but is not part of the active frontend entry path, so it is dead style drift.

Reference mismatch:

- Tide keeps the app theme and Tailwind theme in sync on the same font names: `Inter` and `Hack`.
- Tide serves Font Awesome from the static public layer, not from an app-scoped CSS import chain.

## Incorrect asset usage

- `frontend/index.html` references `/favicon.png`, but the frontend tree does not contain a matching `favicon.png`.
- The active frontend has no `frontend/public/` static asset layer for fonts, Font Awesome, or logos, while Tide serves those assets from `tideterm/public/`.
- `frontend/app/fontawesome.css` wraps static Font Awesome assets that are stored under `frontend/assets/fontawesome/*`; Tide instead exposes the same asset family directly from `/fontawesome/...` in `tideterm/index.html`.
- Logo assets exist under `frontend/assets/logos/*`, but the HTML entrypoint does not use that static set.

Reference mismatch:

- Tide index entrypoint:
  - links `/fontawesome/css/fontawesome.min.css`
  - links `/fontawesome/css/brands.min.css`
  - links `/fontawesome/css/solid.min.css`
  - links `/fontawesome/css/sharp-solid.min.css`
  - links `/fontawesome/css/sharp-regular.min.css`
  - links `/fontawesome/css/custom-icons.min.css`
- Tide public assets live under one static hierarchy: `tideterm/public/fonts/*`, `tideterm/public/fontawesome/*`, `tideterm/public/logos/*`.

## Overlay model mismatch

- `frontend/app/workspace/settings-floating-window.tsx` mounts settings with `useFloating()` as a button-anchored `left-start` flyout.
- That surface is rendered from `frontend/app/workspace/widgets.tsx` alongside tools/files/audit/launcher flyouts and is therefore coupled to the shell rail anchor.
- The settings surface has no modal backdrop and no dedicated full-viewport overlay container.

Reference mismatch:

- Tide’s overlay baseline is the modal system in:
  - `tideterm/frontend/app/element/modal.tsx`
  - `tideterm/frontend/app/element/modal.scss`
- Tide modal surfaces are top-level overlays with full-window coverage, explicit outside-click dismissal, and dedicated z-index ownership.
- The current settings surface does not follow that overlay contract.

## Mismatch with Tide

- Fonts/icons/static assets are not using a single Tide-style source of truth.
- The current frontend keeps both Tide font loader code and a separate theme-level font system.
- The current frontend keeps both static Font Awesome assets and an app-level wrapper import, rather than Tide’s HTML-level static inclusion.
- The current settings/help utility surface is not a true global overlay.
- The current HTML entrypoint uses a missing favicon path and omits Tide’s static Font Awesome links.

## Stability-critical corrections required

- Restore a single Tide-consistent font system.
- Restore a single Tide-consistent Font Awesome/static asset entry path.
- Move settings to a true global overlay layer above shell content, with backdrop and stable z-index.
- Remove dead or duplicate style definitions that conflict with the active Tide-aligned path.
