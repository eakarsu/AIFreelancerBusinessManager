#!/usr/bin/env bash
set -euo pipefail
root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; cd "$root_dir"
[[ -f .env ]] || cp .env.example .env
npm --prefix backend ci
npm --prefix frontend ci
