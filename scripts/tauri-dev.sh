#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_PATH="${ROOT_DIR}/apps/desktop/src-tauri/tauri.conf.json"
CORE_BIN="${ROOT_DIR}/apps/desktop/bin/rterm-core"
FRONTEND_URL="http://127.0.0.1:5173"
FRONTEND_LOG="${ROOT_DIR}/frontend/.vite-dev.log"

fail() {
  echo "error: $*" >&2
  exit 1
}

require_command() {
  local command="$1"
  local guidance="$2"
  if ! command -v "${command}" >/dev/null 2>&1; then
    fail "${guidance}"
  fi
}

wait_for_frontend() {
  local attempts=0
  until curl -sf "${FRONTEND_URL}" >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [[ ${attempts} -ge 50 ]]; then
      fail "frontend dev server did not become ready at ${FRONTEND_URL}. Check ${FRONTEND_LOG}."
    fi
    sleep 0.2
  done
}

require_command npm "npm is required. Install Node.js 24+ and npm 11+."
require_command cargo "cargo is required for Tauri builds. Install the stable Rust toolchain."
require_command curl "curl is required for launch readiness checks."

if [[ "$(uname -s)" == "Darwin" ]] && ! xcode-select -p >/dev/null 2>&1; then
  fail "Xcode Command Line Tools are required on macOS. Run: xcode-select --install"
fi

if [[ ! -x "${CORE_BIN}" ]]; then
  echo "info: Go core binary not found; building it now"
fi

(
  cd "${ROOT_DIR}"
  npm run build:core >/dev/null
) || fail "failed to build the Go core binary. Run: npm run build:core"

if [[ ! -d "${ROOT_DIR}/node_modules" ]]; then
  fail "root dependencies are missing. Run: npm install"
fi

if [[ ! -d "${ROOT_DIR}/frontend/node_modules" ]]; then
  fail "frontend dependencies are missing. Run: npm --prefix frontend install"
fi

(
  cd "${ROOT_DIR}"
  npm exec tauri -- --version >/dev/null 2>&1
) || fail "local Tauri CLI is unavailable. Run: npm install"

frontend_started=0
frontend_pid=""

if ! curl -sf "${FRONTEND_URL}" >/dev/null 2>&1; then
  mkdir -p "$(dirname "${FRONTEND_LOG}")"
  : > "${FRONTEND_LOG}"
  (
    cd "${ROOT_DIR}"
    npm --prefix frontend run dev -- --host 127.0.0.1 --strictPort
  ) >"${FRONTEND_LOG}" 2>&1 &
  frontend_pid=$!
  frontend_started=1
  wait_for_frontend
fi

cleanup() {
  if [[ "${frontend_started}" == "1" && -n "${frontend_pid}" ]]; then
    kill "${frontend_pid}" >/dev/null 2>&1 || true
    wait "${frontend_pid}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

(
  cd "${ROOT_DIR}"
  npm exec tauri -- dev --config "${CONFIG_PATH}" --no-dev-server-wait "$@"
)
