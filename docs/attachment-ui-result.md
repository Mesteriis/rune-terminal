# Attachment UI Truth Result

## 1. Normal attachment references

- Before send: composer chip shows file name/size and `local ref`.
- After send: user transcript row shows attachment chip with `local ref`.
- After reload: same attachment chip is restored from backend snapshot truth.

## 2. Stale references

- If a referenced local file is removed before submit, backend returns `attachment_not_found`.
- UI now marks the affected composer chip as `missing`.
- UI shows explicit guidance that the local file is no longer available and must be re-attached.
- Repeat send attempts with `missing` chips are blocked client-side with explicit message.

## 3. Unsupported/binary references

- In the normal file-picker path, unsupported binary files are rejected before attach in the active UI contract.
- For binary references that are present in backend truth, transcript renders:
  - `local ref`
  - `metadata only`
- UI does not claim full text ingestion for those references.

## 4. Intentionally unsupported

- No preview/gallery UX.
- No managed attachment storage/import.
- No remote/cloud sync or portability.
- No fake upload/blob semantics.

## 5. Explicit reference model note

Attachments are local filesystem references. They are not imported blobs stored by the app.
