# Runtime helper for the Tailscale development Postgres URL.
# Host comes from VITE_SUPABASE_URL; password comes from `supabase status`.
# Do not print, commit, or persist the resolved URL.

_fsl_dev_db_lib_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
_fsl_repo_root="$(cd "$_fsl_dev_db_lib_dir/../.." && pwd -P)"

_fsl_die() {
  printf '错误：%s\n' "$*" >&2
  return 1
}

dev_db_host() {
  local api_url line host

  if [[ -n "${VITE_SUPABASE_URL:-}" ]]; then
    api_url="$VITE_SUPABASE_URL"
  else
    [[ -f "$_fsl_repo_root/.env.local" ]] \
      || { _fsl_die "找不到 .env.local，请配置 VITE_SUPABASE_URL。"; return 1; }
    line="$(sed -n 's/^VITE_SUPABASE_URL=//p' "$_fsl_repo_root/.env.local" | tail -n 1)"
    line="${line%\"}"
    line="${line#\"}"
    line="${line%\'}"
    line="${line#\'}"
    api_url="$line"
  fi

  [[ -n "$api_url" ]] || { _fsl_die "VITE_SUPABASE_URL 为空。"; return 1; }

  host="${api_url#*://}"
  host="${host%%/*}"
  host="${host%%:*}"

  if [[ -z "$host" || "$host" == "127.0.0.1" || "$host" == "localhost" ]]; then
    _fsl_die "VITE_SUPABASE_URL 应指向 Tailscale MagicDNS 主机，而不是 localhost。"
    return 1
  fi

  printf '%s\n' "$host"
}

dev_db_url() {
  local local_db_url
  local remote_host
  local remote_db_url
  local context_name="${FSL_DOCKER_CONTEXT:-remote}"

  command -v docker >/dev/null 2>&1 || { _fsl_die "缺少命令：docker"; return 1; }
  command -v supabase >/dev/null 2>&1 || { _fsl_die "缺少命令：supabase"; return 1; }

  [[ "$(docker context show)" == "$context_name" ]] \
    || docker context use "$context_name" >/dev/null

  remote_host="$(dev_db_host)" || return 1

  local_db_url="$(
    supabase status -o env --workdir "$_fsl_repo_root" 2>/dev/null \
      | sed -n 's/^DB_URL="\(.*\)"$/\1/p'
  )"
  [[ -n "$local_db_url" ]] || {
    _fsl_die "无法从 Supabase 开发栈读取数据库连接信息。请先 npm run db:start。"
    return 1
  }
  [[ "$local_db_url" == *"127.0.0.1"* || "$local_db_url" == *"localhost"* ]] || {
    _fsl_die "Supabase 开发数据库地址不是预期的 loopback 地址。"
    return 1
  }

  remote_db_url="${local_db_url//127.0.0.1/$remote_host}"
  remote_db_url="${remote_db_url//localhost/$remote_host}"
  if [[ "$remote_db_url" == *"?"* ]]; then
    remote_db_url+="&sslmode=disable"
  else
    remote_db_url+="?sslmode=disable"
  fi

  printf '%s\n' "$remote_db_url"
}
