# Attachment Consumption Result

## 1. What attachment references now do

- Message submit revalidates each attachment reference path on the backend.
- Conversation submit resolves local references into bounded attachment context for provider use.
- Provider requests now include attachment metadata and bounded text excerpts when attachments are present.
- Conversation persistence still stores attachment references as metadata on user messages.

## 2. Revalidation behavior

- Submit path now rejects stale or invalid references before conversation persistence:
  - invalid path -> `invalid_attachment_path` (`400`)
  - missing file -> `attachment_not_found` (`404`)
  - directory path -> `invalid_attachment_reference` (`400`)
- Behavior is explicit `reject`; no silent fallback and no auto-repair.

## 3. Content limits

- Local file only; path must be absolute.
- Max file size for content extraction: `256 KiB`.
- Max bytes read per attachment: `32 KiB`.
- Max characters included per attachment excerpt: `8000`.
- Max attachments included in provider context block: `4` (remaining are omitted with a counter).

## 4. Supported file types (current)

- Text-like files are consumed for excerpt context:
  - MIME `text/*`
  - common structured text MIME types (`application/json`, `application/xml`, YAML variants, etc.)
  - common text/code extensions (`.txt`, `.md`, `.json`, `.yaml`, `.go`, `.ts`, `.py`, `.sh`, `.sql`, ...).
- Unsupported or binary-like files are not ingested as text; they are marked as skipped in bounded context metadata.

## 5. Intentionally unsupported

- Managed attachment storage/import pipeline.
- Blob persistence in app state.
- Rich previews/gallery/file manager UX.
- Remote/cloud portability and sync.
