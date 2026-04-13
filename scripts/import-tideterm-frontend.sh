#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_REPO="${1:-$(cd "${ROOT_DIR}/.." && pwd)}"

SOURCE_FRONTEND="${SOURCE_REPO}/frontend"
DEST_FRONTEND="${ROOT_DIR}/frontend/tideterm-src"
DEST_META="${ROOT_DIR}/frontend/tideterm-src-meta"

if [[ ! -d "${SOURCE_FRONTEND}" ]]; then
  echo "source frontend not found: ${SOURCE_FRONTEND}" >&2
  exit 1
fi

mkdir -p "${DEST_FRONTEND}" "${DEST_META}"

rsync -a --delete \
  --exclude 'node_modules' \
  --exclude '.DS_Store' \
  "${SOURCE_FRONTEND}/" "${DEST_FRONTEND}/"

for path in index.html package.json tsconfig.json electron.vite.config.ts; do
  if [[ -f "${SOURCE_REPO}/${path}" ]]; then
    cp "${SOURCE_REPO}/${path}" "${DEST_META}/${path}"
  fi
done

cat <<EOF
Imported TideTerm frontend baseline:
  source: ${SOURCE_FRONTEND}
  renderer snapshot: ${DEST_FRONTEND}
  build metadata snapshot: ${DEST_META}
EOF
