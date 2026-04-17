OUTDATED — DO NOT USE

# Migration Notes

## Source Material

The rewrite used TideTerm documentation and architecture notes as input material:

- AI tool wishlist, roadmap, schema, codemap, policy and backlog
- connection architecture notes
- frontend connection architecture notes
- Wave AI and `useChat` backend notes
- view-model guide
- AI modes configuration notes

## Decisions Taken From The Audit

- keep the block/workspace product idea
- keep the local/SSH trajectory
- keep typed tools and explicit runtime metadata
- remove the dependency on a giant generated RPC contract as the primary product abstraction
- move policy and audit into platform modules rather than chat-specific glue

## Intentional Deviations

- `Tauri` replaces `Electron`
- `Go` becomes the clear backend owner
- `Rust` does not become a second backend
- frontend state is intentionally thinner than the old Jotai-heavy model
- transport is HTTP/SSE with a local loopback token instead of a broad, product-shaped RPC surface

## Non-Goals For The First Milestones

- full parity with TideTerm block catalog
- Windows-first abstractions
- AI provider integration parity
- remote SSH parity

The rewrite optimizes for a correct core, not for a maximal feature checklist.

## Phase Shift: Functional Parity First

The project is now in a parity-first phase.

The implementation rule is:

- keep the new architecture
- copy TideTerm user-visible behavior as closely as possible
- stop inventing replacement UX where TideTerm already has a known-good pattern

That means:

- frontend shell and flows should be TideTerm-derived
- behavior parity beats speculative redesign
- deviations from TideTerm should be documented in `docs/parity-matrix.md`

## Literal frontend baseline import

To enforce parity-first execution, the TideTerm renderer source is imported into this repository as a literal baseline:

- `frontend/tideterm-src/`
- `frontend/tideterm-src-meta/`

This import is not the final architecture.
It is the working baseline for refactoring TideTerm behavior onto the new runtime without continuing to redesign the frontend from scratch.
