# Local Attachment References Result

## 1. What was implemented

- Added explicit local attachment reference contract and typed model.
- Added backend API for creating validated local references:
  - `POST /api/v1/agent/conversation/attachments/references`
- Extended conversation message model with optional `attachments`.
- Extended conversation submit flow to accept and persist attachment references.
- Extended conversation snapshot + compat transcript mapping so persisted attachment references are visible after reload.
- Wired AI panel attach flow to create backend attachment references before send.

## 2. What metadata is persisted

Each persisted attachment reference stores:

- `id`
- `name`
- `path`
- `mime_type`
- `size`
- `modified_time`

This metadata is stored with conversation messages in backend conversation state and returned in snapshots.

## 3. What is NOT persisted

- File bytes/content blobs are not persisted by the app.
- No managed attachment storage in app state-dir.
- No cloud/remote storage indirection.
- No file preview cache persistence as conversation truth.

## 4. Invalid reference behavior

- Reference creation validates local path semantics and rejects invalid inputs:
  - invalid/relative path -> `invalid_attachment_path`
  - missing path at creation time -> `attachment_not_found`
  - directory path -> `invalid_attachment_reference`
- References can become stale if files move/delete after reference creation.
- Current behavior after follow-up hardening:
  - stale references are rejected at message submit (`attachment_not_found`)
  - successful submits continue to persist reference metadata only

## 5. Why this is reference-based, not managed storage

- The model stores local pointers + metadata only.
- Backend remains source of conversation truth, but not file-content storage owner.
- This keeps implementation minimal and explicit while preserving current execution/runtime architecture.
