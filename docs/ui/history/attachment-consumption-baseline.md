# Attachment consumption baseline

## Current behavior

1. AI panel creates local attachment references through `POST /api/v1/agent/conversation/attachments/references` and sends them with `POST /api/v1/agent/conversation/messages`.
2. Backend persists attachment metadata on the user conversation message (`id`, `name`, `path`, `mime_type`, `size`, `modified_time`).
3. Conversation snapshot returns persisted attachment metadata, and frontend restores it after reload.

## What attachments do not do yet

1. Backend submit path does not revalidate attachment paths at message submit time.
2. Backend does not resolve/read attachment content in conversation submit flow.
3. Provider request construction (`CompletionRequest.Messages`) currently uses message text only and does not include attachment-derived context.

## Truth summary

- Attachment metadata persistence: implemented.
- Attachment content consumption by agent/provider: not implemented.
- Stale references at submit time: currently possible.

## Slice boundary

- No managed storage.
- No preview/gallery/file manager UX.
- No remote/cloud sync or portability.
