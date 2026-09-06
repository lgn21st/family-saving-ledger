#!/usr/bin/env bash

remote_docker_host() {
  local context_name
  local docker_endpoint
  local endpoint_authority

  context_name="${FSL_DOCKER_CONTEXT:-remote}"
  docker_endpoint="$(docker context inspect "$context_name" --format '{{.Endpoints.docker.Host}}')"
  [[ "$docker_endpoint" == ssh://* ]] || {
    printf '错误：Docker context %s 不是 SSH endpoint。\n' "$context_name" >&2
    return 1
  }

  endpoint_authority="${docker_endpoint#ssh://}"
  endpoint_authority="${endpoint_authority%%/*}"
  printf '%s\n' "${endpoint_authority##*@}"
}

remote_db_url() {
  local local_db_url
  local remote_host
  local remote_db_url

  remote_host="$(remote_docker_host)"

  local_db_url="$(
    supabase status -o env 2>/dev/null \
      | sed -n 's/^DB_URL="\(.*\)"$/\1/p'
  )"
  [[ -n "$local_db_url" ]] || {
    printf '错误：无法从 Supabase 开发栈读取数据库连接信息。\n' >&2
    return 1
  }
  [[ "$local_db_url" == *"127.0.0.1"* ]] || {
    printf '错误：Supabase 开发数据库地址不是预期的 loopback 地址。\n' >&2
    return 1
  }

  remote_db_url="${local_db_url/127.0.0.1/$remote_host}"
  if [[ "$remote_db_url" == *"?"* ]]; then
    remote_db_url+="&sslmode=disable"
  else
    remote_db_url+="?sslmode=disable"
  fi

  printf '%s\n' "$remote_db_url"
}
