# Parity Gap Summary

Date: `2026-04-17`
Source of truth: [parity-matrix.md](./parity-matrix.md)

## Release blocking

- Shell chrome parity (`UX`): compact TideTerm-recognizable shell hierarchy still `PARTIAL`.
- Remote daily-driver confidence (`remote`): SSH workflow is `PARTIAL` in breadth despite core catalog/lifecycle being present.
- Launcher/workspace-switcher parity (`navigation`): both remain `PARTIAL` for recognizability and breadth.
- AI panel shell balance parity (`panels`): core behavior exists, but full parity feel remains `PARTIAL`.

## Near-term

- Terminal UX hardening (`terminal`):
  - scrollback hydration confidence
  - copy/paste parity edge cases
  - jump-to-latest control parity
  - drag/drop path parity breadth
- MCP external onboarding (`MCP`): settings can register remote endpoints and run lifecycle controls, but broad discovery/catalog setup remains `PARTIAL`.
- Settings surface breadth (`panels`): intentionally reduced scope vs TideTerm.
- Last-tab closure behavior (`workspace/layout`): currently guarded.
- Attachment UX breadth (`UX`): files-to-AI queued references and removable composer chips exist, but managed storage/gallery UX remains partial.

## Optional

- Advanced SSH auth/topology (`remote`) — `MISSING`
- Multi-session terminal block (`terminal`) — `MISSING`
- Terminal advanced affordances/search/sidebar (`UX`) — `MISSING`
- Plugin ecosystem/discovery (`plugins`) — `MISSING` (local Go/Python reference plugins exist; install/discovery UX remains out of scope)
- Streaming AI response breadth (`UX`) — `PARTIAL` (OpenAI-compatible text deltas plus frontend cancel are live; CLI token/reasoning/tool-call streaming remains absent)
