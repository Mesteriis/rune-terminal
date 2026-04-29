# 0032. Runtime-Backed Language Switch Surface

- Status: Accepted

## Context

The historical TideTerm inventory included an immediate language switch
surface, but `rterm` deliberately retired that row during the earlier
clone cleanup because the active frontend rewrite did not yet have:

- a repository-owned localization boundary
- a backend-owned preference contract
- a clear answer for which active shell surfaces should be translated
  first

That decision is now being reopened as product work, not as a parity-only
checkbox.

The project needs a language switch that fits the current architecture:

- one runtime-owned preference, not browser-local competing state
- immediate UI updates on the active shell path without restart
- a narrow initial translation boundary that is honest about what is and
  is not localized yet

## Decision

`rterm` will introduce a runtime-backed language preference and an
incremental frontend localization layer for the active shell path.

Accepted direction:

- persist the active locale in `runtime.db`
- expose that locale through an explicit HTTP settings contract
- let the frontend hydrate and update locale from that runtime contract
- apply locale changes immediately without app restart
- start with the active shell/settings surfaces instead of attempting a
  one-shot full-product translation sweep

Initial supported locales:

- `en`
- `ru`
- `zh-CN`
- `es`

Initial translation boundary in this phase:

- settings-shell navigation and section framing
- `General` / runtime settings content
- `Terminal` settings content through a typed locale copy module
- shell-level localization plumbing required to make the setting live

Explicitly out of scope in this phase:

- translating every existing widget/body copy in the product
- introducing a second frontend-only i18n state source
- server-side locale negotiation or per-request locale routing

## Consequences

Positive:

- the product regains an immediate language switch on the active shell
  path
- locale preference becomes part of the same runtime-owned settings
  family as terminal, agent, and window-title settings
- further translation work can expand from a clean, typed boundary

Negative:

- the first slice is intentionally partial in breadth: untranslated
  sections can still exist outside the initial boundary
- more widgets will need follow-up translation passes if broad
  localization becomes a product requirement

## Alternatives considered

### Browser-local i18n state with no backend persistence

Rejected. That would create a second source of truth beside the runtime
settings model already used by the active shell.

### Full-product translation before introducing the setting

Rejected. That would delay useful operator value and push too much mixed
copy work into one unsafe batch.
