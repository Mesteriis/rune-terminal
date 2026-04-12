#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${ROOT_DIR}/apps/desktop/bin"

mkdir -p "${OUTPUT_DIR}"
"${ROOT_DIR}/scripts/go.sh" build -o "${OUTPUT_DIR}/rterm-core" ./cmd/rterm-core

