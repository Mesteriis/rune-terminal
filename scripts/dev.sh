#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  local exit_code="${1:-0}"

  if [[ -n "${FRONTEND_PID}" ]] && kill -0 "${FRONTEND_PID}" 2>/dev/null; then
    kill "${FRONTEND_PID}" 2>/dev/null || true
    wait "${FRONTEND_PID}" 2>/dev/null || true
  fi

  if [[ -n "${BACKEND_PID}" ]] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    kill "${BACKEND_PID}" 2>/dev/null || true
    wait "${BACKEND_PID}" 2>/dev/null || true
  fi

  exit "${exit_code}"
}

on_exit() {
  local exit_code=$?
  trap - EXIT INT TERM
  cleanup "${exit_code}"
}

trap on_exit EXIT INT TERM

cd "${ROOT_DIR}"

echo "Starting split local dev loop:"
echo "  backend:  ${LOCAL_BACKEND_URL:-http://127.0.0.1:8090} (air)"
echo "  frontend: http://${LOCAL_FRONTEND_HOST:-127.0.0.1}:${LOCAL_FRONTEND_PORT:-5173} (vite)"

env \
  LOCAL_BACKEND_LISTEN="${LOCAL_BACKEND_LISTEN:-127.0.0.1:8090}" \
  LOCAL_BACKEND_URL="${LOCAL_BACKEND_URL:-http://127.0.0.1:8090}" \
  LOCAL_AUTH_TOKEN="${LOCAL_AUTH_TOKEN:-runa-local-dev-token}" \
  LOCAL_TASK_CONTROL_TOKEN="${LOCAL_TASK_CONTROL_TOKEN:-runa-local-dev-task-token}" \
  "${ROOT_DIR}/scripts/run-backend-watch.sh" &
BACKEND_PID=$!

env \
  VITE_RTERM_API_BASE="${LOCAL_BACKEND_URL:-http://127.0.0.1:8090}" \
  VITE_RTERM_AUTH_TOKEN="${LOCAL_AUTH_TOKEN:-runa-local-dev-token}" \
  npm --prefix frontend run dev -- --host "${LOCAL_FRONTEND_HOST:-127.0.0.1}" --strictPort --port "${LOCAL_FRONTEND_PORT:-5173}" &
FRONTEND_PID=$!

while true; do
  if ! kill -0 "${BACKEND_PID}" 2>/dev/null; then
    wait "${BACKEND_PID}" || true
    break
  fi

  if ! kill -0 "${FRONTEND_PID}" 2>/dev/null; then
    wait "${FRONTEND_PID}" || true
    break
  fi

  sleep 1
done

cleanup 1
