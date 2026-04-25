# 0026. Conversation Threads and Provider Session Persistence

- Status: Accepted

## Context

The first backend conversation slice made free-text chat real, but the runtime still behaved like one flat transcript with a fresh provider process on each new user prompt.

That was not sufficient for the current shell contract:

- operators need explicit conversations, not one ever-growing message list
- a conversation should survive shell reloads and desktop restarts
- CLI-backed providers should retain provider-native context within one conversation
- hidden helper prompts must not silently mutate the provider-native session

The shell already has a real backend-owned AI panel path. The base step was to make conversation identity explicit without broadening immediately into archive/search/rename UX or speculative autonomy.

## Decision

rune-terminal introduces backend-owned conversation threads as persisted runtime entities.

This slice adds:

- SQLite-backed conversation storage in `runtime.db`
- explicit conversation entities plus messages and active-conversation state
- one active conversation at a time for the shell AI sidebar
- dedicated transport routes:
  - `GET /api/v1/agent/conversations`
  - `POST /api/v1/agent/conversations`
  - `PUT /api/v1/agent/conversations/{conversationID}/activate`
- provider session state persisted per conversation
- persisted conversation-scoped context preferences:
  - `widget_context_enabled`
  - explicit `widget_ids`
- provider session reuse only when the stored session matches the active provider kind

CLI provider continuity now works like this:

- `codex` reuses the provider-native thread/session id returned by the CLI
- `claude` reuses a stable session id per conversation
- switching conversations switches the stored provider session with it
- switching conversations also restores the stored widget-context preference for that conversation
- helper paths such as hidden explain/promote flows do **not** reuse or mutate the stored provider-native session

The old single-file transcript remains only as a bootstrap source for migration into the database. It is no longer the active source of truth once the service is initialized.

## Consequences

Positive:

- AI history is now grouped into explicit backend conversations
- shell reload and desktop restart restore the active conversation from the database
- CLI-backed providers retain context within a conversation instead of starting cold on every prompt
- request-context selection is now also part of the conversation entity instead of transient frontend state
- header/body AI sidebar state can bind to a stable backend conversation identity

Negative:

- conversation management remains intentionally staged: the base slice owns create + switch, while follow-up slices add rename, delete, archive, and restore without broadening into archive-management views, broader search, or multi-panel lifecycle
- broader conversation search and multi-panel conversation lifecycle remain future work
- provider-native sessions are persisted only as lightweight runtime metadata, not as a broad provider abstraction
- hidden helper prompts must stay disciplined so they do not accidentally contaminate stored provider sessions

## Alternatives considered

### Keep one flat transcript and prepend more local history to each provider call

Rejected. That keeps the UI looking thread-aware while the runtime remains stateless and expensive for CLI providers.

### Store conversations in frontend state only

Rejected. Conversation identity is runtime truth and must survive shell reloads and desktop restarts.

### Reuse provider-native sessions for every AI code path

Rejected. Helper/explain paths must stay auditable and must not invisibly alter the operator-visible conversation session.
