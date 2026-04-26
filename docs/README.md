# rune-terminal docs

The project is **rune-terminal** (short name **`rterm`**, Go module
`github.com/Mesteriis/rune-terminal`). This directory is the canonical
documentation root. Everything outside `_meta/`, domain folders and
`history/` sub-trees should be considered out of date.

The project is pre-release — there is no `v1.0.0` tag and no release
train is active. See [`workflow/roadmap.md`](./workflow/roadmap.md) and
[`workflow/known-limitations.md`](./workflow/known-limitations.md).

## Structure overview

```text
docs/
  README.md
  architecture/            # system-level architecture + ADRs
    adr/
  execution/               # tool runtime + command execution
  workspace/               # workspace model and window behavior
  remote/                  # SSH / remote session model
  mcp/                     # MCP integration
  plugins/                 # plugin protocol and runtime
  workflow/                # roadmap, known limitations, workflows, release notes
  parity/                  # legacy parity matrix and gap summaries (mostly historical)
  validation/              # validation reports per domain
  _meta/                   # docs-about-docs (inventory, structure rules)
```

Each domain folder keeps a flat set of active documents at the top and
archives superseded documents under `history/`.

## Canonical quick links

- Architecture overview: [architecture/system.md](./architecture/system.md)
- Domain model: [architecture/domain-model.md](./architecture/domain-model.md)
- Terminal architecture: [architecture/terminal-architecture.md](./architecture/terminal-architecture.md)
- Tool runtime: [architecture/tool-runtime.md](./architecture/tool-runtime.md)
- Policy model: [architecture/policy-model.md](./architecture/policy-model.md)
- Execution model: [execution/execution-model.md](./execution/execution-model.md)
- Workspace model: [workspace/workspace-model.md](./workspace/workspace-model.md)
- Remote model: [remote/remote-model.md](./remote/remote-model.md)
- MCP model: [mcp/mcp-model.md](./mcp/mcp-model.md)
- Plugin runtime: [plugins/plugin-runtime.md](./plugins/plugin-runtime.md)
- Plugin protocol: [plugins/plugin-runtime-protocol.md](./plugins/plugin-runtime-protocol.md)

## Workflow

- Roadmap: [workflow/roadmap.md](./workflow/roadmap.md)
- Known limitations: [workflow/known-limitations.md](./workflow/known-limitations.md)
- Operator workflow: [workflow/operator-workflow.md](./workflow/operator-workflow.md)
- Agent modes: [workflow/agent-modes.md](./workflow/agent-modes.md)
- System prompts: [workflow/system-prompts.md](./workflow/system-prompts.md)

## Security

- Security policy: [../SECURITY.md](../SECURITY.md)
- Plugin permission boundary: [architecture/adr/0027-plugin-process-permission-boundary.md](./architecture/adr/0027-plugin-process-permission-boundary.md)

## Parity (historical context)

rune-terminal is no longer running a parity-matrix workflow against any
upstream. These files remain for historical reference:

- [parity/parity-matrix.md](./parity/parity-matrix.md)
- [parity/gap-summary.md](./parity/gap-summary.md)
- [parity/clone-status-matrix.md](./parity/clone-status-matrix.md)

## Validation

- Entrypoint: [validation/validation.md](./validation/validation.md)
- Agent: [validation/agent.md](./validation/agent.md)
- Execution: [validation/execution.md](./validation/execution.md)
- Terminal: [validation/terminal.md](./validation/terminal.md)
- Workspace: [validation/workspace.md](./validation/workspace.md)
- Remote: [validation/remote.md](./validation/remote.md)
- MCP: [validation/mcp.md](./validation/mcp.md)
- Plugins: [validation/plugins.md](./validation/plugins.md)
- Workflow: [validation/workflow.md](./validation/workflow.md)
- Infrastructure: [validation/infrastructure.md](./validation/infrastructure.md)

## Frontend docs

The frontend keeps its own documentation next to the source, since the
frontend is currently being rewritten and its docs evolve with it:

- [`frontend/docs/ui-architecture.md`](../frontend/docs/ui-architecture.md)

## Meta

- [`_meta/docs-inventory.md`](./_meta/docs-inventory.md) — current
  inventory of active documents
- [`_meta/docs-structure.md`](./_meta/docs-structure.md) — rules for
  where a new doc should live
