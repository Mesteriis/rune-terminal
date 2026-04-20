# 0020. AI Conversation Backend Foundation

- Status: Accepted

## Context

rune-terminal had already reached a credible TideTerm-shaped AI panel shell, but the panel still behaved mostly like a runtime-backed activity surface.

Free-text prompts did not traverse a real backend conversation path. Unsupported prompts ended in a frontend-owned placeholder response, which meant:

- the transcript was not a true backend-owned conversation
- assistant messages were not real provider outputs
- role/mode/profile context was not projected through an actual conversation backend
- the shell looked more real than the underlying product behavior actually was

We need a narrow slice that makes the panel real without expanding into speculative AI autonomy, broad tool-calling, or a new frontend UX.

## Decision

rune-terminal introduces a dedicated `core/conversation` domain as the first real AI conversation backend slice.

This slice implements:

- a persisted backend-owned conversation transcript
- a narrow provider adapter interface
- an Ollama provider path over HTTP
- dedicated transport routes:
  - `GET /api/v1/agent/conversation`
  - `POST /api/v1/agent/conversation/messages`
- projection of prompt profile, role preset, and work mode into the backend system prompt through the Go app layer
- audit events for conversation success and provider failure

The current provider path is intentionally narrow:

- provider: Ollama
- transport: HTTP
- response mode: non-streaming
- transcript behavior: user message plus a complete or error assistant message

Frontend runtime/action/approval feed entries remain, but they are merged with the backend conversation transcript in the AI panel instead of pretending to be the whole conversation model.

## Consequences

Positive:

- the AI panel is no longer only a frontend/runtime activity feed
- free-text prompts now reach a real backend conversation service
- assistant responses are real provider outputs
- provider failures are visible in the transcript and audit trail
- the new path keeps the current TideTerm-derived panel grammar stable

Negative:

- this is not streaming conversation yet
- this is not autonomous tool-calling or a deeper AI orchestration layer
- file attachment remains a placeholder
- the current provider path depends on a reachable Ollama instance and a responsive local model

## Alternatives considered

### Keep the frontend placeholder fallback for one more iteration

Rejected. The shell had already reached a level where the fake conversation path was the next major product credibility gap.

### Add conversation logic directly inside frontend hooks

Rejected. That would recreate frontend-owned product semantics instead of introducing a proper backend domain.

### Jump straight to streaming plus tool-calling

Rejected. That would broaden the slice too much and risk speculative AI redesign before the basic conversation path is real.
