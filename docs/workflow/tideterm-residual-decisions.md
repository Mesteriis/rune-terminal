# TideTerm Residual Decisions

Date: `2026-04-26`

This note records how the remaining TideTerm-specific residual surfaces
map to the active `rterm` product boundary.

## Language switching

Decision: `Not carried forward`

Reason:

- the active frontend rewrite is not currently organized around a real
  localization program
- the old TideTerm language-switch surface lives in legacy UI residue, not
  in the active `frontend/src/` shell
- reintroducing it now would add surface area without a current runtime or
  product requirement behind it

Reopen trigger:

- a first-class localization requirement for the active frontend

## Window title rules

Decision: `Retained narrowly`

Reason:

- a runtime-backed window-title surface still makes product sense in the
  current shell
- the old TideTerm title manager should not be copied directly from the
  legacy compat path

Planned shape:

- narrow runtime-backed rules for auto title plus explicit operator rename
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
