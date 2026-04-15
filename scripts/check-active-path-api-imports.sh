#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGETS=(
  "$ROOT_DIR/frontend/app/tab"
  "$ROOT_DIR/frontend/app/workspace"
  "$ROOT_DIR/frontend/app/view/term"
)

PATTERN='(?:rterm-api/http/client|compat/api)'

violations=$(rg -n -U -e "$PATTERN" "${TARGETS[@]}" 2>/dev/null || true)

if [ -n "$violations" ]; then
  echo "Active UI path API import guard failed"
  echo
  echo "Forbidden imports detected in active surfaces:" >&2
  echo "$violations"
  echo
  echo "Allowed pattern: only store/facade ownership in this migration slice."
  exit 1
fi

echo "Active UI API import guard passed: no direct rterm-api/http/client or compat/api imports in app/tab, app/workspace, app/view/term"
