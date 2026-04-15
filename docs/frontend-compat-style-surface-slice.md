# Frontend Compat Style Surface Stabilization

Date: `2026-04-15`

## Scope

This slice stabilizes only the active compat style surface used by:

- the top shell and tab bar
- the workspace shell and terminal area
- the AI panel
- the settings floating menu

It does not redesign components or rewrite the DOM structure.

## Active Style Entrypoint Audit

Observed active style entrypoints on the visible compat path:

1. `frontend/index.html` loads `frontend/wave.ts`
2. `frontend/wave.ts` boots the browser compat runtime
3. `frontend/app/app.tsx` imports:
   - `overlayscrollbars/overlayscrollbars.css`
   - `./app.scss`
   - `../tailwindsetup.css`
4. transitive component imports then bring in active SCSS for:
   - tabs
   - terminal
   - AI panel
   - modal/menu surfaces

Styles present in `frontend/assets` but previously not connected to the active compat path:

- `frontend/assets/fontawesome/css/*.min.css`
- `frontend/assets/fontawesome/webfonts/*.woff2`
- `frontend/assets/style.scss`

Only the Font Awesome package was actually required on the active path because the rendered compat DOM already uses `fa-*` icon classes in:

- AI trigger
- sidebar/settings actions
- settings floating menu

`frontend/assets/style.scss` remained inactive and was not pulled into the fix because it is not required by the validated compat DOM path.

## Root Cause

Two separate asset-pipeline gaps were causing the visible drift.

### 1. Tailwind utilities were not being compiled

`frontend/tailwindsetup.css` was imported, but `frontend/vite.config.ts` did not register `@tailwindcss/vite`.

That meant the active shell received base/theme CSS but not the generated utility layer used by the compat DOM.

Validated before the fix:

- served `tailwindsetup.css` still contained unprocessed Tailwind directives
- utility selectors such as `.text-2xl`, `.h-\\[26px\\]`, `.px-1\\.5`, `.items-center`, `.justify-end`, `.bg-hover` were absent from the served CSS
- the visible AI trigger collapsed to approximately `13.4px x 17px`
- the `TideTerm AI` heading stayed at `14px` instead of the expected larger utility-driven sizing

### 2. Icon font assets existed locally but were never joined to the active style graph

The compat DOM rendered multiple `fa-*` icon classes, but `frontend/app/app.tsx` did not import any Font Awesome stylesheet entrypoint.

On top of that, the copied vendor CSS still referenced `.ttf` fallbacks that do not exist in `frontend/assets/fontawesome/webfonts/`, where only `.woff2` files are shipped.

## Changes

### `frontend/vite.config.ts`

- added `@tailwindcss/vite`
- inserted `tailwindcss()` into the active Vite plugin chain

This makes `frontend/tailwindsetup.css` compile into real utilities in both `dev` and production build output.

### `frontend/app/app.tsx`

- added `import "./fontawesome.css";`

The import sits on the active compat app path, so the icon styles now travel with the real shell instead of relying on legacy global assets.

### `frontend/app/fontawesome.css`

Added a narrow Font Awesome entrypoint that imports only the copied packages needed by the active shell:

- `fontawesome.min.css`
- `solid.min.css`
- `sharp-regular.min.css`
- `sharp-solid.min.css`
- `brands.min.css`
- `custom-icons.min.css`

### `frontend/assets/fontawesome/css/*.min.css`

Adapted the copied vendor `@font-face` rules to the assets that actually exist in this repo:

- removed dead `.ttf` fallback URLs
- kept the shipped `.woff2` URLs

This avoids broken secondary asset references inside the Vite pipeline.

## Validation

Validation environment:

```bash
npx tsc -p frontend/tsconfig.json --noEmit
npm --prefix frontend run build

RTERM_AUTH_TOKEN=modal-compat-token apps/desktop/bin/rterm-core serve --listen 127.0.0.1:52760 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/runa-modal-compat-state
VITE_RTERM_API_BASE=http://127.0.0.1:52760 VITE_RTERM_AUTH_TOKEN=modal-compat-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4190 --strictPort
VITE_RTERM_API_BASE=http://127.0.0.1:52760 VITE_RTERM_AUTH_TOKEN=modal-compat-token npm --prefix frontend run build
npm --prefix frontend run preview -- --host 127.0.0.1 --port 4191 --strictPort
```

Observed after the fix in `dev`:

- utility-driven controls regained expected sizing and spacing:
  - AI button expanded from about `13.4px x 17px` to about `42.4px x 26px`
  - AI button padding became `6px` on both sides
  - AI button background resolved to `rgba(255, 255, 255, 0.1)`
  - `TideTerm AI` heading computed `font-size` became `18px`
  - `AI` heading computed `font-size` became `24px`
- icon assets loaded successfully:
  - `/assets/fontawesome/webfonts/fa-solid-900.woff2` -> `200`
  - `/assets/fontawesome/webfonts/fa-brands-400.woff2` -> `200`
- Vite no longer emitted the previous build warnings about unknown Tailwind at-rules

Observed after the fix in `preview`:

- production shell loaded a single CSS bundle:
  - `/assets/index-BEwtfeU0.css` -> `200`
- the bundle loaded real font assets from `dist/assets`:
  - `/assets/Inter-Variable-Latin-8kRkwJBP.woff2` -> `200`
  - `/assets/JetBrainsMono-Regular-V6pRDFza.woff2` -> `200`
  - `/assets/JetBrainsMono-Bold-BYuf6tUa.woff2` -> `200`
  - `/assets/fa-solid-900-BoIGJYu2.woff2` -> `200`
- `document.fonts` contained loaded faces for:
  - `Inter`
  - `Hack`
  - `Font Awesome 6 Pro`
- AI panel and settings floating menu both rendered with correct iconography, spacing, and layout on the production bundle

## Classification

- active required styles: `connected`
  - `overlayscrollbars.css`
  - `app.scss`
  - `tailwindsetup.css`
  - active transitive SCSS modules
  - new `fontawesome.css`
- imported but inactive styles: `frontend/assets/style.scss`
- missing dependency before fix: `@tailwindcss/vite`
- broken asset references before fix: Font Awesome vendor `.ttf` URLs that had no matching files
- path issue after fix: `not observed` on the active compat style path
- remaining visual parity gaps: partial
  - the shell is now styled and usable, but any further mismatch must be classified against the current compat DOM rather than against the previously broken pipeline

## Residual Observations

One non-style runtime defect still surfaced during extra dev interactions:

- `Failed to fetch apps: TypeError: Cannot read properties of null (reading 'filter')`
- source: `frontend/app/workspace/widgets.tsx`

This slice did not touch that code path.
It is a separate runtime/data defect, not evidence of a broken CSS or font pipeline.
