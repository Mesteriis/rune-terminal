#!/usr/bin/env bash
set -euo pipefail

if command -v go >/dev/null 2>&1; then
  GO_BIN="$(command -v go)"
elif [ -x /opt/homebrew/bin/go ]; then
  GO_BIN="/opt/homebrew/bin/go"
elif [ -x /usr/local/go/bin/go ]; then
  GO_BIN="/usr/local/go/bin/go"
else
  echo "go toolchain not found. Install Go 1.26+ or set GO_BIN." >&2
  exit 1
fi

exec "${GO_BIN}" "$@"

