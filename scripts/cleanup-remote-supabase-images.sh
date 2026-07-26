#!/usr/bin/env bash

set -euo pipefail

die() {
  printf '错误：%s\n' "$*" >&2
  exit 1
}

for command_name in docker sort; do
  command -v "$command_name" >/dev/null 2>&1 || die "缺少命令：$command_name"
done

[[ "$(docker context show)" == "remote" ]] || docker context use remote >/dev/null
docker_endpoint="$(docker context inspect remote --format '{{.Endpoints.docker.Host}}')"
[[ "$docker_endpoint" == "ssh://jarvis-sg" ]] \
  || die "remote context 指向 $docker_endpoint，而不是 ssh://jarvis-sg"

unused_image_ids=""
for image_id in $(docker image ls --filter 'reference=public.ecr.aws/supabase/*' -q | sort -u); do
  if [[ -z "$(docker ps -a --filter ancestor="$image_id" -q)" ]]; then
    unused_image_ids="$unused_image_ids $image_id"
  fi
done

if [[ -z "${unused_image_ids// /}" ]]; then
  printf '没有未被容器引用的 Supabase 镜像。\n'
  docker system df
  exit 0
fi

printf '将删除以下未被任何容器引用的 Supabase 镜像：\n'
for image_id in $unused_image_ids; do
  docker image inspect "$image_id" --format '  {{join .RepoTags ", "}}  {{.Size}} bytes'
done

read -r -p '输入 PRUNE jarvis-sg 继续: ' confirmation
[[ "$confirmation" == "PRUNE jarvis-sg" ]] || die "已取消"

docker image rm $unused_image_ids
docker system df
