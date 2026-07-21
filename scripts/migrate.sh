#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Export DATABASE_URL before running migrations}"
root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
for migration in "$root_dir"/backend/migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"; done
