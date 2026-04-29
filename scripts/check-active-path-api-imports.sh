#!/usr/bin/env bash
set -euo pipefail

# Active frontend layer import guard.
#
# This is intentionally narrow while the frontend rewrite is still in motion:
# - shared UI may not import higher layers
# - widgets may not import the app orchestration layer
#
# Widget-to-feature imports still exist in the active rewrite and are not
# checked here until those adapters are split behind a narrower boundary.

violations=0

check_imports() {
  local label="$1"
  local root="$2"
  local pattern="$3"

  if rg --glob '!**/*.test.*' --glob '!**/*.spec.*' -n "$pattern" "$root"; then
    echo "Layer violation: ${label}" >&2
    violations=1
  fi
}

check_imports "shared UI must not import app/features/widgets/layouts" \
  frontend/src/shared/ui \
  "@/((app|features|widgets|layouts)/)"

check_imports "widgets must not import app orchestration" \
  frontend/src/widgets \
  "@/app/"

if [[ "$violations" -ne 0 ]]; then
  exit 1
fi

echo "Active UI layer import guard passed."
