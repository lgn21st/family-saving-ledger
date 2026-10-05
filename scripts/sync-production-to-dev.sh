#!/usr/bin/env bash

set -euo pipefail
umask 077

readonly DB_CONTAINER="supabase_db_family-saving-ledger"
readonly APP_TABLES="accounts app_users interest_log settings transactions"
readonly MINIMAL_EXCLUDES="edge-runtime,imgproxy,logflare,mailpit,postgres-meta,realtime,storage-api,studio,supavisor,vector"

die() {
  printf '错误：%s\n' "$*" >&2
  exit 1
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
source "$script_dir/lib/dev-db.sh"
repo_root="$(cd "$script_dir/.." && pwd -P)"
cd "$repo_root"

[[ $# -eq 0 ]] || die "用法：scripts/sync-production-to-dev.sh"
backup_root="$repo_root/.local-backups/production-sync"

for command_name in supabase docker git awk sort shasum; do
  command -v "$command_name" >/dev/null 2>&1 || die "缺少命令：$command_name"
done

[[ -f supabase/.temp/project-ref ]] || die "当前仓库尚未 link 到 production Supabase 项目"
[[ "$(docker context show)" == "remote" ]] || docker context use remote >/dev/null
docker_endpoint="$(docker context inspect remote --format '{{.Endpoints.docker.Host}}')"
[[ "$docker_endpoint" == ssh://* ]] \
  || die "remote context 不是 SSH endpoint"

mkdir -p "$backup_root"
backup_root="$(cd "$backup_root" && pwd -P)"
git check-ignore -q "$backup_root" || die "备份目录未被 Git 忽略"

timestamp="$(date -u '+%Y%m%dT%H%M%SZ')"
bundle_dir="$backup_root/production-$timestamp"
mkdir "$bundle_dir"
chmod 700 "$bundle_dir"
production_dump="$bundle_dir/public-data.sql"
dev_backup="$bundle_dir/dev-before-sync.sql"

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

printf '2/5 启动远程开发环境的最小 Supabase 服务集...\n'
supabase start --exclude "$MINIMAL_EXCLUDES" >/dev/null
docker inspect "$DB_CONTAINER" >/dev/null 2>&1 || die "找不到 $DB_CONTAINER"
"$script_dir/run-on-remote-db.sh" migration up

printf '3/5 备份并清空远程开发数据库当前业务数据...\n'
dev_url="$(dev_db_url)"
supabase db dump --db-url "$dev_url" --data-only --use-copy --schema public \
  --file "$dev_backup"
chmod 600 "$dev_backup"
backup_tables="$(awk '
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
' "$dev_backup" | LC_ALL=C sort -u)"
[[ "$backup_tables" == "$expected_tables" ]] || die "开发库备份的业务表范围不符"
shasum -a 256 "$dev_backup" > "$dev_backup.sha256"

printf '\n归档目录：%s\n' "$bundle_dir"
read -r -p '输入 SYNC dev 以覆盖开发数据: ' confirmation
[[ "$confirmation" == "SYNC dev" ]] || die "已取消"

supabase db query --db-url "$dev_url" --file "$script_dir/sql/truncate-app-tables.sql" \
  >/dev/null

printf '4/5 单事务导入 production 数据...\n'
# COPY restore still needs a Postgres client; the Mac does not ship psql, so
# this step uses the remote DB container over the Docker SSH context.
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres \
  --single-transaction --set ON_ERROR_STOP=on \
  --command 'SET session_replication_role = replica;' \
  --file - < "$production_dump"

printf '5/5 验证账本数据...\n'
"$script_dir/run-on-remote-db.sh" db query --file "$script_dir/sql/validate-synced-ledger.sql"

printf '\n同步完成。\nproduction 归档：%s\n开发库回滚备份：%s\n' \
  "$production_dump" "$dev_backup"
