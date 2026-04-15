#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_PATH="${ROOT_DIR}/apps/desktop/src-tauri/tauri.conf.json"
CORE_BIN="${ROOT_DIR}/apps/desktop/bin/rterm-core"
FRONTEND_URL="http://127.0.0.1:5173"
FRONTEND_PORT="5173"
FRONTEND_LOG="${ROOT_DIR}/frontend/.vite-dev.log"
FRONTEND_PID_FILE="${ROOT_DIR}/frontend/.vite-dev.pid"

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

stop_owned_frontend_process() {
  if [[ ! -f "${FRONTEND_PID_FILE}" ]]; then
    return
  fi
  local pid
  pid="$(cat "${FRONTEND_PID_FILE}" | tr -d '[:space:]')"
  rm -f "${FRONTEND_PID_FILE}"
  if [[ -z "${pid}" ]] || ! [[ "${pid}" =~ ^[0-9]+$ ]]; then
    return
  fi
  if kill -0 "${pid}" >/dev/null 2>&1; then
    kill "${pid}" >/dev/null 2>&1 || true
    wait "${pid}" >/dev/null 2>&1 || true
  fi
}

stop_frontend_listeners_on_port() {
  local pids
  pids="$(lsof -tiTCP:"${FRONTEND_PORT}" -sTCP:LISTEN -nP || true)"
  if [[ -z "${pids}" ]]; then
    return
  fi
  local pid
  while IFS= read -r pid; do
    [[ -z "${pid}" ]] && continue
    if ! kill -0 "${pid}" 2>/dev/null; then
      continue
    fi
    local cmd
    cmd="$(ps -p "${pid}" -o command= 2>/dev/null || true)"
    if [[ "${cmd}" == *"${ROOT_DIR}"* ]] && [[ "${cmd}" == *"vite"* || "${cmd}" == *"npm run dev"* ]]; then
      kill "${pid}" >/dev/null 2>&1 || true
      wait "${pid}" >/dev/null 2>&1 || true
    fi
  done <<<"${pids}"
}

require_command npm "npm is required. Install Node.js 24+ and npm 11+."
require_command cargo "cargo is required for Tauri builds. Install the stable Rust toolchain."
require_command curl "curl is required for launch readiness checks."
require_command lsof "lsof is required to free the frontend dev server port."

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

mkdir -p "$(dirname "${FRONTEND_LOG}")"
: > "${FRONTEND_LOG}"
stop_owned_frontend_process
stop_frontend_listeners_on_port

(
  cd "${ROOT_DIR}"
  npm --prefix frontend run dev -- --host 127.0.0.1 --strictPort --port "${FRONTEND_PORT}"
) >"${FRONTEND_LOG}" 2>&1 &
frontend_pid=$!
echo "${frontend_pid}" > "${FRONTEND_PID_FILE}"
frontend_started=1
wait_for_frontend

cleanup() {
  if [[ "${frontend_started}" == "1" && -n "${frontend_pid}" ]]; then
    kill "${frontend_pid}" >/dev/null 2>&1 || true
    wait "${frontend_pid}" >/dev/null 2>&1 || true
    rm -f "${FRONTEND_PID_FILE}"
  fi
  stop_frontend_listeners_on_port
}

trap cleanup EXIT

(
  cd "${ROOT_DIR}"
  npm exec tauri -- dev --config "${CONFIG_PATH}" --no-dev-server-wait "$@"
)
