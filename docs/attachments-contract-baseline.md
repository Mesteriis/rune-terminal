# Attachments Contract Baseline

## 1. Current attach UI behavior

- Active compat AI panel has an attach button (`paperclip`) and drag/drop handling.
- Selected files are stored in frontend state (`model.droppedFiles`) and rendered in local dropped-files UI.
- On submit in compat path, if `droppedFiles.length > 0`, request is rejected locally with:
  - `Attachment transport is not wired into the active compat conversation path yet.`
- Result: attach UI currently acts as a placeholder and does not send files to backend conversation APIs.

## 2. Current backend support

- Conversation endpoints accept only prompt + context:
  - `POST /api/v1/agent/conversation/messages`
  - `POST /api/v1/agent/terminal-commands/explain`
- Current payloads have no attachment field, no upload ticket, and no storage reference contract.
- No dedicated attachment upload/storage route is part of the active agent conversation path.

## 3. Current message model constraints

- Persisted conversation messages are text-centric (`role`, `content`, `status`, provider/model metadata).
- `/run` transcript truth is persisted as standard conversation messages (user prompt + assistant execution result + explanation).
- Reload/snapshot truth comes from backend `conversation.messages`; frontend-only dropped files are not part of persisted transcript truth.

## 4. Relationship to conversation persistence, /run, audit, execution contract

- Conversation persistence: attachment claims must be backed by backend-stored references, not frontend-only file state.
- `/run`: attach placeholder must not alter current `/run` execution semantics or approval flow.
- Audit: any future attachment-related execution must remain backend-auditable; frontend cannot author audit truth.
- Execution contract: attachment references must be explicit input/context data, not implicit UI memory.

## 5. Strict slice boundary

- No actual attachment feature implementation.
- No storage subsystem work.
- No upload UX redesign.

## Minimal attachments contract

### A. Minimal attachment metadata shape

```json
{
  "id": "att_...",
  "name": "design-notes.md",
  "mime_type": "text/markdown",
  "size_bytes": 12345,
  "storage_ref": "opaque-backend-ref"
}
```

- `id`: stable attachment reference used by conversation/audit/execution payloads.
- `storage_ref`: backend-owned opaque pointer; frontend treats it as non-interpreted token.
- No raw file bytes in conversation message payloads.

### B. Storage truth ownership

- Storage truth is backend-owned.
- Frontend may upload/select, but cannot claim persistence without backend-issued attachment references.
- Attachment availability on reload must come from backend snapshot/message payload, not from frontend memory.

### C. Persisted conversation representation

- Persisted conversation messages may include optional attachment references, while keeping text content explicit.
- Attachment references must be durable identifiers resolvable by backend at reload time.
- Local UI file pills without backend-issued attachment references are explicitly non-persistent.

### D. Explicit first-implementation non-goals

- Binary transfer protocol design.
- File storage provider implementation.
- OCR/indexing/search over attachments.
- Rich attachment rendering UX redesign.
- Attachment-driven tool execution changes outside explicit contract updates.
