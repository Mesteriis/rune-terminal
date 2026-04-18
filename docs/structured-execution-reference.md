# Structured Execution Reference

Date: `2026-04-17`
Phase: stability hardening

This document records the repo-root Tide sources inspected for structured-execution guardrails. Those Tide sources were used as the primary reference for this parity batch.

## Tide source files inspected

- `tideterm/frontend/app/view/term/term-model.ts`
  - informs shell-readiness gating and active-session ownership
- `tideterm/frontend/app/view/term/term.tsx`
  - informs active terminal-session selection and connection-bound session UI
- `tideterm/frontend/app/store/keymodel.ts`
  - informs how new terminal blocks inherit the active session's connection/cwd context
- `tideterm/frontend/app/view/term/termwrap.ts`
  - informs shell-integration readiness states and active command/busy tracking
- `tideterm/pkg/blockcontroller/shellcontroller.go`
  - informs connection-bound shell launch validation and mismatch failure behavior
- `tideterm/pkg/aiusechat/usechat-prompts.go`
  - informs Tide AI's explicit non-execution posture when command/terminal control is not available through an explicit tool path

## Extracted reference behavior

### 1. How target/session is determined

- Tide terminal ownership is session-local and connection-bound:
  - terminal session rows in [`tideterm/frontend/app/view/term/term.tsx`](/Users/avm/projects/Personal/tideterm/runa-terminal/tideterm/frontend/app/view/term/term.tsx:121) render the session block's `meta.connection` and `cmd:cwd`
  - multi-session terminals track an explicit active session id (`term:activesessionid`) and let the operator switch that active session explicitly
- New terminal blocks inherit the focused terminal session's working directory and connection:
  - [`tideterm/frontend/app/store/keymodel.ts`](/Users/avm/projects/Personal/tideterm/runa-terminal/tideterm/frontend/app/store/keymodel.ts:356) copies `cmd:cwd` and `connection` from the active session block into the new terminal block definition
- Shell runtime target truth is ultimately the block/session connection:
  - [`tideterm/pkg/blockcontroller/shellcontroller.go`](/Users/avm/projects/Personal/tideterm/runa-terminal/tideterm/pkg/blockcontroller/shellcontroller.go:667) resolves local-vs-remote launch behavior from connection metadata and rejects invalid connection variants

### 2. How mistakes are prevented

- Tide only advertises AI command capability when shell integration says the active terminal is ready:
  - [`tideterm/frontend/app/view/term/term-model.ts`](/Users/avm/projects/Personal/tideterm/runa-terminal/tideterm/frontend/app/view/term/term-model.ts:412) shows:
    - no shell integration -> "TideTerm AI unable to run commands"
    - running command -> "TideTerm AI unable to run commands while another command is running"
    - ready -> "TideTerm AI can run commands in this terminal"
- Shell integration readiness is explicit runtime state, not an inferred heuristic:
  - [`tideterm/frontend/app/view/term/termwrap.ts`](/Users/avm/projects/Personal/tideterm/runa-terminal/tideterm/frontend/app/view/term/termwrap.ts:370) tracks `ready` vs `running-command`
- The connection boundary is preserved when creating or switching terminal sessions:
  - the active session connection is carried forward instead of silently changing to another connection
- Tide's AI prompt contract is intentionally conservative:
  - [`tideterm/pkg/aiusechat/usechat-prompts.go`](/Users/avm/projects/Personal/tideterm/runa-terminal/tideterm/pkg/aiusechat/usechat-prompts.go:38) explicitly says Tide AI cannot execute shell commands or interact with remote files unless explicit tooling exists

### 3. What happens on mismatch or unavailable state

- If the active terminal is not shell-integrated or is currently running another command, Tide surfaces that AI command execution is unavailable rather than pretending it can still run safely.
- If the connection configuration is invalid or unsupported, Tide shell startup fails explicitly:
  - [`tideterm/pkg/blockcontroller/shellcontroller.go`](/Users/avm/projects/Personal/tideterm/runa-terminal/tideterm/pkg/blockcontroller/shellcontroller.go:667) rejects unsupported local connection variants
  - [`tideterm/pkg/blockcontroller/shellcontroller.go`](/Users/avm/projects/Personal/tideterm/runa-terminal/tideterm/pkg/blockcontroller/shellcontroller.go:347) rejects missing or disconnected SSH targets
- The inspected Tide sources do not show a path where AI silently retargets from one session/connection to another.

## Reference implications for RunaTerminal parity

- Structured execution must stay bound to an explicit terminal/session identity.
- Shell/AI execution must not silently infer a different widget/session when the request is ambiguous.
- Local vs remote identity must be explicit and must fail closed on mismatch.
- Non-terminal execution surfaces must not inherit terminal-session identity accidentally.

## Source ambiguity

- The inspected repo-root Tide sources do not expose a direct `/run` grammar or the exact structured-execution transport used by RunaTerminal.
- The strongest reference available in Tide is therefore the shell/session ownership model:
  - explicit active terminal session
  - explicit connection inheritance
  - explicit shell-readiness gating
  - explicit refusal/error states instead of silent retargeting
- RunaTerminal's `/run` path is an architectural adaptation on top of those Tide-visible shell guardrails, not a line-for-line port of a Tide `/run` implementation.
