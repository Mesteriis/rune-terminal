# Provider Model Discovery Validation

## Last verified state

- Date: `2026-04-22`
- State: `VERIFIED`
- Scope:
  - backend model discovery for direct `openai` and `ollama` providers
  - compatibility with provider base URLs entered both with `/v1` and without it
  - Ollama discovery fallback from native `/api/tags` to OpenAI-compatible model catalog paths when the host is reverse-proxied through `/v1`

## Commands/tests used

- Repository audit:
  - `sed -n '1,260p' core/conversation/provider_models.go`
  - `sed -n '1,260p' core/conversation/provider_ollama.go`
  - `sed -n '1,260p' core/app/provider_models.go`
  - `sed -n '250,420p' core/transport/httpapi/handlers_agent_providers_test.go`
  - `sed -n '1,220p' core/conversation/provider_models_test.go`
- Targeted validation:
  - `go test ./core/conversation`
  - `go test ./core/transport/httpapi`

## Verified behavior

- `POST /api/v1/agent/providers/models` for `openai` now tolerates both base URL forms:
  - `<base>/models`
  - `<base>/v1/models`
- `POST /api/v1/agent/providers/models` for `ollama` still prefers the native Ollama catalog:
  - `<base>/api/tags`
- If the Ollama host is only reachable through an OpenAI-compatible reverse-proxy surface, discovery now falls back to:
  - `<base>/models`
  - `<base>/v1/models`
- `OllamaProvider.resolveModel(...)` now uses the same discovery path, so automatic model selection without an explicitly saved model follows the same fallback behavior as the settings dropdown.

## Notes

- This step only fixes model discovery and runtime model auto-selection.
- It does not change the direct Ollama chat transport itself; `ollama` runtime requests still use the native chat path.
