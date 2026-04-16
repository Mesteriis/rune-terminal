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

## 4. Contract validation for local reference model

- Conversation persistence: attachment claims must be backed by backend-persisted attachment references, not frontend-only file state.
- Execution envelope: attachment references must be explicit message input data and remain typed; no hidden UI-only path assumptions.
- `/run`: attachment support must not alter current `/run` execution semantics, approval flow, or retry behavior.
- Audit model: when attachment-backed execution is performed by backend flows, audit truth remains backend-owned; frontend cannot author audit history.
- Local-program constraints: the first implementation is local-reference only and inherits normal local filesystem volatility.

## 5. Strict slice boundary

- No managed blob/storage subsystem.
- No implicit file copy into app state-dir.
- No remote/cloud attachment portability.
- No upload UX redesign.

## Minimal local attachment contract

### A. Minimal attachment metadata shape

```json
{
  "id": "att_...",
  "name": "design-notes.md",
  "path": "/absolute/local/path/design-notes.md",
  "mime_type": "text/markdown",
  "size": 12345,
  "modified_time": 1713279000
}
```

- `id`: stable attachment reference id used in conversation payloads/snapshots.
- `path`: normalized local filesystem pointer; this is reference truth, not managed storage.
- `mime_type`, `size`, `modified_time`: lightweight metadata for validation and transcript rendering.
- No content/blob fields; no raw file bytes in conversation message payloads.

### B. Persistence truth ownership

- Backend owns persisted conversation truth, including attachment references attached to messages.
- Frontend may select local files and request reference creation, but cannot claim persistence without backend-backed references.
- Reload must reflect references from backend snapshot, not from frontend memory cache.

### C. Persisted conversation representation

- Persisted conversation messages may include optional `attachments` with local references (`id + path + metadata`).
- This does not imply file content persistence.
- Local UI file pills without backend-persisted references are explicitly non-persistent.

### D. Explicit first-implementation non-goals

- Managed file storage/import pipeline.
- Binary upload/content transfer protocol.
- OCR/indexing/search over attachments.
- Rich attachment rendering UX redesign.

### E. Local reference failure semantics

- Local references may become invalid if the original file is moved, deleted, or permissions change.
- Invalid references remain part of persisted transcript metadata but can fail at read/resolve time.
- This behavior is expected for local reference mode and is not treated as managed-storage corruption.
