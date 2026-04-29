# TideTerm Residual Decisions

Date: `2026-04-27`

This note records how the remaining TideTerm-specific residual surfaces
map to the active `rterm` product boundary.

## Language switching

Decision: `Implemented narrowly`

Reason:

- a runtime-backed language preference makes sense on the active shell
  path even though the repository still does not claim a broad i18n
  program
- the old TideTerm toggle should not be copied as a legacy-only browser
  preference detached from runtime truth

Delivered shape:

- backend-owned locale settings contract at `GET/PUT /api/v1/settings/locale`
- explicit supported locales `ru`, `en`, `zh-CN`, and `es`
- immediate shell-language switching on the active `General` settings path
- active settings shell framing plus general/runtime copy read from that
  one persisted locale preference
- terminal settings copy now uses the same typed locale boundary for the
  active `Terminal` settings path
- no claim yet that every active widget or settings subsection is fully
  translated

## Window title rules

Decision: `Implemented narrowly`

Reason:

- a runtime-backed window-title surface still makes product sense in the
  current shell
- the old TideTerm title manager should not be copied directly from the
  legacy compat path

Delivered shape:

- narrow runtime-backed rules for auto title plus explicit operator rename
- backend-owned `auto/custom` title settings contract with persisted
  custom title state
- active shell `document.title` sync that follows the current workspace
  title in `auto` mode and respects explicit operator rename in `custom`
  mode
- no legacy compat-only title manager revival

## WaveProxy

Decision: `Not carried forward`

Reason:

- the repository already treats broad proxy/provider universes as out of
  scope in the current phase
- the active AI direction is explicit CLI providers plus one narrow
  OpenAI-compatible HTTP source, not a TideTerm-style internal proxy layer
- MCP, plugins, and explicit transport contracts already cover the active
  extension story better than reviving WaveProxy semantics

Reopen trigger:

- a future focused transport/infrastructure requirement that cannot be
  solved by the current provider, MCP, or plugin contracts
