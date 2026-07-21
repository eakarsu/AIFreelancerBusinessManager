#!/usr/bin/env bash
set -euo pipefail
[[ "${CONFIRM_DEMO_SEED:-}" == "yes" ]] || { echo "Set CONFIRM_DEMO_SEED=yes; this seed is for an isolated demo database only." >&2; exit 1; }
npm --prefix "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/backend" run seed
