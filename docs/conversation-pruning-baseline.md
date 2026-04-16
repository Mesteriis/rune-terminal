# Conversation Pruning Baseline

## Current accumulation behavior

- `core/conversation/service.go` persists every submitted user message and every assistant result in `state.Messages`.
- The persisted transcript is append-only in the current implementation.
- `Snapshot()` returns the full persisted transcript to the frontend.

## Where full history is sent

- `Service.Submit()` appends the new user message, copies the full persisted history, and passes that full copy into `complete()`.
- `Service.AppendAssistantPrompt()` also copies the full persisted history, appends the transient user prompt, and passes the full list into `complete()`.
- `complete()` currently forwards every non-empty persisted `user` and `assistant` message into `CompletionRequest.Messages`.
- `core/conversation/provider_ollama.go` sends that full `CompletionRequest.Messages` array to Ollama in `/api/chat`.

## Practical risk

- Provider requests grow without a hard bound as the transcript grows.
- Long-lived conversations can send unnecessary old turns, increasing prompt size, latency, and the chance of provider-side context overflow.
- The UI transcript can remain useful even if provider context is pruned, but the current implementation does not separate those concerns.

## Slice boundary

- No provider expansion
- No new memory system
- No UI redesign
