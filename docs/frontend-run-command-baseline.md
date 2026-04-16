# frontend `/run` command baseline

Date: `2026-04-16`

## Release slice

- Release relevance: `P0 release-blocker`
- Exact slice: AI panel `/run <command>` execution + explanation wiring
- In scope:
  - active compat AI panel submit path
  - backend routes already present in `core/transport/httpapi/api.go`
  - existing tool/runtime/policy execution path
- Out of scope:
  - AI panel redesign
  - new backend execution semantics
  - streaming output
  - transcript/UI component redesign

## 1. Current message send flow

Active UI path:

- `frontend/app/aipanel/aipanel-compat.tsx`
  - initial load:
    - `getConversationFacade().getSnapshot()` -> `GET /api/v1/agent/conversation`
    - `getAgentFacade().getCatalog()` -> `GET /api/v1/agent`
    - `createCompatApiFacade().clients.bootstrap.getBootstrap()` -> `GET /api/v1/bootstrap`
  - submit:
    - `handleSubmit(...)`
    - reads composer text from `WaveAIModel.inputAtom`
    - builds context via `buildCompatConversationContext(repoRoot)`
    - always calls `conversationFacade.submitMessage(...)`

Typed frontend client path:

- `frontend/compat/conversation.ts`
- `frontend/rterm-api/conversation/client.ts`
- `POST /api/v1/agent/conversation/messages`

Current transcript render path:

- backend `ConversationSnapshot` is mapped by `frontend/app/aipanel/compat-conversation.ts`
- transcript is rendered through existing `AIPanelMessages` / `AIMessage`
- no special `/run` render path exists in the active panel

## 2. Where `/run` is currently treated as plain text

Current active behavior in `frontend/app/aipanel/aipanel-compat.tsx`:

- submit path trims input
- rejects only empty input and file-attachment cases
- does not parse `/run ` or `run: `
- sends the raw composer text to `POST /api/v1/agent/conversation/messages`

Result:

- `/run echo hello` is currently handled as a normal conversation prompt
- no terminal snapshot is captured
- no `term.send_input` tool call is executed
- no explain route call is issued
- current UI therefore ignores the intended explicit command grammar at the routing layer

## 3. Backend routes already available

Conversation routes in `core/transport/httpapi/api.go`:

- `GET /api/v1/agent/conversation`
- `POST /api/v1/agent/conversation/messages`
- `POST /api/v1/agent/terminal-commands/explain`

Relevant runtime/tool routes already present:

- `POST /api/v1/tools/execute`
  - required for `term.send_input`
  - preserves policy, approval, and audit behavior
- `GET /api/v1/terminal/{widgetID}`
  - exposes `next_seq`
  - supports capturing terminal output after command execution
- `POST /api/v1/terminal/{widgetID}/input`
  - direct terminal input route exists, but ADR `0020` and current behavior docs define `/run` through the tool/runtime path instead

Relevant backend implementation:

- `core/app/tool_terminal.go`
  - `term.send_input`
- `core/app/ai_terminal_command.go`
  - explanation route reads observed terminal output from `from_seq`
  - appends an assistant reply to the persisted conversation transcript
- `core/transport/httpapi/handlers_agent_conversation.go`
  - exposes the explain transport

## 4. What is missing

Missing frontend wiring in the active compat panel:

- prefix detection for `/run `
- extraction of the terminal command from the composer text
- terminal snapshot fetch to capture `next_seq` before execution
- `term.send_input` execution through `POST /api/v1/tools/execute`
- approval handling for `requires_confirmation`
- explain request to `POST /api/v1/agent/terminal-commands/explain`
- transcript refresh/render using the existing message stream after execution/explanation

Current risk if left unchanged:

- repo docs claim an explicit `/run` path exists in the active AI panel
- active compat UI still routes `/run` as plain conversation text
- release validation for the AI command execution slice cannot be completed honestly until the compat panel uses the existing runtime/tool/explain path
