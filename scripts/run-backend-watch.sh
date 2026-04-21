#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AIR_VERSION="${RTERM_AIR_VERSION:-v1.63.1}"
AIR_HOME="${RTERM_AIR_HOME:-${ROOT_DIR}/tmp/tools/air}"
AIR_BIN="${AIR_HOME}/bin/air"
AIR_CONFIG="${ROOT_DIR}/tmp/air/rterm-air.toml"
LISTEN_ADDR="${LOCAL_BACKEND_LISTEN:-127.0.0.1:8090}"

mkdir -p "${AIR_HOME}/bin" "${AIR_HOME}/gocache" "${AIR_HOME}/gomodcache" "${ROOT_DIR}/tmp/air"

if [[ ! -x "${AIR_BIN}" ]]; then
  echo "Installing air-verse/air ${AIR_VERSION} into ${AIR_HOME}/bin"
  GOBIN="${AIR_HOME}/bin" \
  GOCACHE="${AIR_HOME}/gocache" \
  GOMODCACHE="${AIR_HOME}/gomodcache" \
  "${ROOT_DIR}/scripts/go.sh" install "github.com/air-verse/air@${AIR_VERSION}"
fi

cd "${ROOT_DIR}"

sed \
  -e "s|__RTERM_ROOT__|${ROOT_DIR}|g" \
  -e "s|__RTERM_LISTEN__|${LISTEN_ADDR}|g" \
  "${ROOT_DIR}/.air.toml" > "${AIR_CONFIG}"

echo "Starting standalone Go core with air at ${LOCAL_BACKEND_URL:-http://127.0.0.1:8090}"

exec env \
  RTERM_AUTH_TOKEN="${LOCAL_AUTH_TOKEN:-runa-local-dev-token}" \
  "${AIR_BIN}" -c "${AIR_CONFIG}"
