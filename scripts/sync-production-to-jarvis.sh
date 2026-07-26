#!/usr/bin/env bash

set -euo pipefail
umask 077

readonly DB_CONTAINER="supabase_db_family-saving-ledger"
readonly SSH_HOST="jarvis-sg"
readonly TUNNEL_SOCKET="/tmp/family-saving-ledger-supabase-tunnel.sock"
readonly APP_TABLES="accounts app_users interest_log settings transactions"
readonly MINIMAL_EXCLUDES="edge-runtime,imgproxy,logflare,mailpit,postgres-meta,realtime,storage-api,studio,supavisor,vector"

die() {
  printf '错误：%s\n' "$*" >&2
  exit 1
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd "$script_dir/.." && pwd -P)"
cd "$repo_root"

[[ $# -eq 0 ]] || die "用法：scripts/sync-production-to-jarvis.sh"
backup_root="$repo_root/.local-backups/production-sync"

for command_name in supabase docker git ssh lsof awk sort shasum; do
  command -v "$command_name" >/dev/null 2>&1 || die "缺少命令：$command_name"
done

[[ -f supabase/.temp/project-ref ]] || die "当前仓库尚未 link 到 production Supabase 项目"
[[ "$(docker context show)" == "remote" ]] || docker context use remote >/dev/null
docker_endpoint="$(docker context inspect remote --format '{{.Endpoints.docker.Host}}')"
[[ "$docker_endpoint" == "ssh://jarvis-sg" ]] \
  || die "remote context 指向 $docker_endpoint，而不是 ssh://jarvis-sg"

mkdir -p "$backup_root"
backup_root="$(cd "$backup_root" && pwd -P)"
git check-ignore -q "$backup_root" || die "备份目录未被 Git 忽略"

timestamp="$(date -u '+%Y%m%dT%H%M%SZ')"
bundle_dir="$backup_root/production-$timestamp"
mkdir "$bundle_dir"
chmod 700 "$bundle_dir"
production_dump="$bundle_dir/public-data.sql"
jarvis_backup="$bundle_dir/jarvis-before-sync.sql"

printf '1/5 从 linked production 导出 public 数据...\n'
supabase db dump --linked --data-only --use-copy --schema public --file "$production_dump"
chmod 600 "$production_dump"

actual_tables="$(awk '
  /^COPY "public"\."/ {
    line = $0
    sub(/^COPY "public"\."/, "", line)
    sub(/".*/, "", line)
    print line
  }
  /^COPY public\./ {
    line = $0
    sub(/^COPY public\./, "", line)
    sub(/[ (].*/, "", line)
    print line
  }
' "$production_dump" | LC_ALL=C sort -u)"
expected_tables="$(printf '%s\n' $APP_TABLES | LC_ALL=C sort)"
[[ "$actual_tables" == "$expected_tables" ]] || die "production dump 的业务表范围不符"
shasum -a 256 "$production_dump" > "$production_dump.sha256"

printf '2/5 启动 jarvis-sg 最小 Supabase 服务集...\n'
if ! ssh -S "$TUNNEL_SOCKET" -O check "$SSH_HOST" >/dev/null 2>&1; then
  [[ ! -e "$TUNNEL_SOCKET" ]] || rm -f "$TUNNEL_SOCKET"
  for port in 54321 54322; do
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 \
      && die "本机端口 $port 已被占用"
  done
  ssh -M -S "$TUNNEL_SOCKET" -fN \
    -o ExitOnForwardFailure=yes \
    -o ServerAliveInterval=15 \
    -o ServerAliveCountMax=6 \
    -L 54321:127.0.0.1:54321 \
    -L 54322:127.0.0.1:54322 \
    "$SSH_HOST"
fi
supabase start --exclude "$MINIMAL_EXCLUDES" >/dev/null
docker inspect "$DB_CONTAINER" >/dev/null 2>&1 || die "找不到 $DB_CONTAINER"
supabase migration up --local

printf '3/5 备份并清空 jarvis 当前业务数据...\n'
docker exec "$DB_CONTAINER" pg_dump -U postgres -d postgres \
  --data-only --no-owner --no-privileges --schema=public \
  --table=public.app_users --table=public.accounts \
  --table=public.transactions --table=public.settings \
  --table=public.interest_log > "$jarvis_backup"
chmod 600 "$jarvis_backup"
shasum -a 256 "$jarvis_backup" > "$jarvis_backup.sha256"

printf '\n归档目录：%s\n' "$bundle_dir"
read -r -p '输入 SYNC jarvis-sg 以覆盖开发数据: ' confirmation
[[ "$confirmation" == "SYNC jarvis-sg" ]] || die "已取消"

docker exec "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -c 'TRUNCATE TABLE public.interest_log, public.transactions, public.accounts, public.app_users, public.settings RESTART IDENTITY CASCADE;'

printf '4/5 单事务导入 production 数据...\n'
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres \
  --single-transaction --set ON_ERROR_STOP=on \
  --command 'SET session_replication_role = replica;' \
  --file - < "$production_dump"

printf '5/5 验证账本数据...\n'
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres \
  -v ON_ERROR_STOP=1 --file - < "$script_dir/sql/validate-synced-ledger.sql"

printf '\n同步完成。\nproduction 归档：%s\njarvis 回滚备份：%s\n' \
  "$production_dump" "$jarvis_backup"
