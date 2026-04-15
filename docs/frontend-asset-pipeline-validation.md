# Frontend Asset Pipeline Validation

Date: `2026-04-15`

Status: historical baseline.

This document captures the pre-fix audit that proved the old compat asset path was not loading custom fonts and that legacy `/fonts/*` URLs were broken.

Current post-fix state is documented in:

- `docs/frontend-compat-style-surface-slice.md`
- `docs/validation.md` under `Latest frontend compat style surface stabilization`

## Scope

This pass stayed validation-only and focused on the active compat asset path for:

- CSS bootstrap and runtime application
- font loading behavior
- path resolution in dev and production-preview

No UI component code or styling rules were changed.

## Active Asset Entry Path

Observed active compat asset path:

1. `frontend/index.html:11` loads `frontend/wave.ts`
2. `frontend/wave.ts:291-308` enters `initBare()`
3. when `hasNativePreloadApi === false`, `frontend/wave.ts:301-303` goes directly to `initBrowserCompatRuntime()` and returns before `loadFonts()`
4. `frontend/app/app.tsx:20-33` imports the compat CSS chain:
   - `overlayscrollbars/overlayscrollbars.css`
   - `./app.scss`
   - `../tailwindsetup.css`
5. `frontend/app/app.scss` pulls the wider SCSS graph including `theme.scss` and terminal styles

This means the active browser compat path gets CSS through the JS import graph, not through a static `<link rel="stylesheet">` in source `index.html`.

## Dev Validation

Validation environment:

```bash
RTERM_AUTH_TOKEN=asset-pipeline-token apps/desktop/bin/rterm-core serve --listen 127.0.0.1:52750 --workspace-root /Users/avm/projects/Personal/tideterm/runa-terminal --state-dir /tmp/runa-asset-pipeline-state
VITE_RTERM_API_BASE=http://127.0.0.1:52750 VITE_RTERM_AUTH_TOKEN=asset-pipeline-token npm --prefix frontend run dev -- --host 127.0.0.1 --port 4183 --strictPort
```

Observed CSS requests on fresh compat load:

- `GET /node_modules/overlayscrollbars/styles/overlayscrollbars.css` -> `200`
- `GET /app/app.scss` -> `200`
- `GET /tailwindsetup.css` -> `200`
- `GET /app/view/term/xterm.css` -> `200`
- many transitive SCSS modules requested by the live component graph -> `200`

Observed CSS order on the active path:

1. `overlayscrollbars.css`
2. `app.scss`
3. `tailwindsetup.css`
4. terminal and transitive component SCSS

Observed runtime application:

- no CSS `404` requests were observed
- `document.styleSheets` contained Vite-injected `STYLE` nodes for:
  - `frontend/app/app.scss`
  - `frontend/tailwindsetup.css`
  - `frontend/app/view/term/xterm.css`
  - multiple transitive SCSS modules
- computed styles confirmed CSS application:
  - `body.fontFamily = Inter, sans-serif`
  - `body.backgroundColor = rgb(34, 34, 34)`
  - `body.margin = 0px`
  - `#main.display = flex`
  - root CSS variables such as `--base-font`, `--fixed-font`, and `--main-bg-color` were resolved

Observed font behavior on the active compat path:

- `performance` resource entries contained no `.woff`, `.woff2`, or `.ttf` loads
- `document.fonts` contained no custom `FontFace` entries
- no font decode warnings were raised on the active compat load

Conclusion for dev:

- CSS is loading
- CSS is applying
- custom webfonts are not loading on the active compat path
- that font absence is caused by runtime flow, not by CSS failing to mount

## Production Preview Validation

Validation environment:

```bash
VITE_RTERM_API_BASE=http://127.0.0.1:52750 VITE_RTERM_AUTH_TOKEN=asset-pipeline-token npm --prefix frontend run build
npm --prefix frontend run preview -- --host 127.0.0.1 --port 4184 --strictPort
```

Observed production asset shape:

- `frontend/dist/index.html:33` links a single stylesheet bundle:
  - `/assets/index-DtSIslWN.css`
- `frontend/dist/index.html:8` loads the JS bundle:
  - `/assets/index-DQoA6f_J.js`

Observed CSS requests on fresh preview load:

- `GET /assets/index-DtSIslWN.css` -> `200`
- no stylesheet `404` requests were observed

Observed runtime application:

- computed styles in preview matched the dev compat shell for the validated containers:
  - `body.fontFamily = Inter, sans-serif`
  - `body.backgroundColor = rgb(34, 34, 34)`
  - `#main.display = flex`
  - `.xterm-rows.fontFamily = Hack`
- `document.styleSheets` showed one linked bundle plus runtime-generated `STYLE` nodes used by the terminal renderer

Observed font behavior on the active preview path:

- no font resource requests were made during the normal compat load
- `document.fonts` remained empty for custom faces
- no font decode warnings were raised during the normal compat load

Conclusion for production preview:

- the production CSS bundle loads and applies
- active compat startup still does not load custom webfonts
- the visual drift is not explained by a missing CSS bundle

## Font Path Replay

`frontend/util/fontutil.ts:19-86` still defines legacy custom font URLs:

- `fonts/inter-variable.woff2`
- `fonts/jetbrains-mono-v13-latin-regular.woff2`
- `fonts/hacknerdmono-regular.ttf`
- additional related files in the same relative `fonts/` directory

The active compat browser path does not call `loadFonts()` because `frontend/wave.ts:301-303` returns before `frontend/wave.ts:308`.

To validate the latent native-font path without changing runtime behavior, the same `FontFace` URLs were replayed manually in production preview.

Observed result:

- `FontFace.load()` failed for all replayed URLs with:
  - `A network error occurred.`
- browser warnings were emitted:
  - `Failed to decode downloaded font`
  - `OTS parsing error: invalid sfntVersion: 1008821359`

Why this happens:

- `fetch('/fonts/inter-variable.woff2')` returned:
  - `status: 200`
  - `content-type: text/html`
  - body starting with `<!doctype html>`
- `vite preview` served SPA fallback HTML for `/fonts/*` instead of an actual font file
- the frontend tree has no shipped `frontend/fonts`, `frontend/public/fonts`, or `frontend/dist/fonts` directory
- `frontend/dist/assets` contains KaTeX fonts only; it does not contain the `Inter`, `Hack`, or `JetBrains Mono` assets referenced by `fontutil.ts`

Conclusion for legacy custom font URLs:

- the path is broken
- the failure is asset-path / asset-presence related, not a CSS-order issue
- if native preload startup continues to call `loadFonts()`, it will hit invalid `/fonts/*` responses unless those assets are shipped or the URLs are rewritten

## Dev vs Production Preview

Observed differences:

- dev injects many stylesheet modules as `STYLE` tags via Vite
- production preview serves one linked CSS bundle and a small number of runtime `STYLE` tags

Observed similarities:

- the active compat shell renders with CSS applied in both modes
- root variables and main dark-theme colors resolve in both modes
- no custom webfont requests occur in the active compat path in either mode

## Classification

- CSS not loading: `not supported by evidence`
- CSS loading but not applying: `not supported by evidence`
- fonts not loading on active compat path: `confirmed`
- fonts intentionally disabled on active compat path: `confirmed`
- path broken for legacy custom fonts: `confirmed`
- CSS order broken: `not observed`
- Vite base path as the root cause for the active compat CSS failure: `not supported by evidence`

## Final Conclusion

The validated break is not a collapsed CSS pipeline.

The evidence points to two separate facts:

1. the active compat UI loads and applies CSS correctly in both dev and production preview
2. the expected custom font pipeline is absent on the active compat path and the old manual `/fonts/*` loader points at assets that are not shipped

So the current design drift is primarily explained by missing custom fonts, not by missing CSS.
