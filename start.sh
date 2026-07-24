#!/usr/bin/env bash
set -euo pipefail
root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$root_dir"
[[ -f .env ]] || { echo "Missing .env; copy .env.example and configure it." >&2; exit 1; }
set -a
# shellcheck disable=SC1091
source ./.env
set +a
[[ -d backend/node_modules && -d frontend/node_modules ]] || { echo "Dependencies missing; run scripts/bootstrap.sh." >&2; exit 1; }
pids=()
cleanup() { for pid in "${pids[@]:-}"; do kill "$pid" 2>/dev/null || true; done; }
trap cleanup EXIT INT TERM
npm --prefix backend start & pids+=("$!")
npm --prefix frontend run dev -- --host "${HOST:-127.0.0.1}" --port "${FRONTEND_PORT:-3000}" & pids+=("$!")
wait
