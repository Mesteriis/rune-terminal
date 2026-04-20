#!/usr/bin/env bash
set -euo pipefail

# Active-path API import guard.
#
# Original intent: prevent widgets/pages from importing the low-level HTTP
# client or compat facade directly, so ownership stayed inside a dedicated
# store/facade layer. The original targets (frontend/app/tab, frontend/app/
# workspace, frontend/app/view/term) no longer exist — the frontend is being
# rewritten under frontend/src/.
#
# Until the rewritten frontend introduces a real HTTP client boundary,
# there is nothing to guard. This script intentionally short-circuits as a
# pass so that it remains wired into `make validate` without emitting false
# positives or scanning code paths that do not exist.
#
# When the new frontend wires up a real client (e.g. under
# frontend/src/shared/api/) the guard should be rewritten to forbid direct
# imports of that client outside an allowlist of boundary files.

echo "Active UI API import guard: no active targets yet (frontend rewrite in progress)."
