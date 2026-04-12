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

