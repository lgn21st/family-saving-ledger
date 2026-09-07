#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
source "$script_dir/lib/dev-db.sh"
cd "$_fsl_repo_root"

[[ $# -gt 0 ]] || {
  printf '用法：scripts/run-on-remote-db.sh <supabase 子命令>\n' >&2
  exit 1
}

db_url="$(dev_db_url)"
supabase "$@" --db-url "$db_url"
