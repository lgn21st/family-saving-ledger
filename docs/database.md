# 数据库与运维

本文是 schema、开发库、production 和相关脚本的唯一操作说明。
环境见 [开发与验证](development.md)。账本不变量与 RPC 列表见
`.agents/skills/family-ledger-domain/references/ledger-model.md`。

## 环境

| 名称 | 是什么 | 怎么连 |
| --- | --- | --- |
| 开发库 | 远程 Docker 上的精简 Supabase（Postgres / GoTrue / Kong / PostgREST） | Tailscale MagicDNS；主机来自 `.env.local` 的 `VITE_SUPABASE_URL` |
| production | 已 link 的云端 Supabase 项目 | `supabase db push --linked`；IPv4-only 用 Session Pooler |

`supabase --local` 永远打本机 `127.0.0.1`，不要用来迁开发库。
`scripts/lib/dev-db.sh` 在运行时用 MagicDNS 主机名替换 loopback，密码来自
`supabase status`，不写文件。`supabase start` 和清镜像仍用 Docker context `remote`。

## 命令与脚本

改脚本名或用法时，只改这一节和下面引用它的详细步骤。

| 入口 | 作用 |
| --- | --- |
| `npm run db:start` | 在 Docker context `remote` 上启动精简栈 |
| `npm run db:migrate` | 开发库增量 migration |
| `npm run db:lint` | 开发库 schema lint |
| `npm run test:db` | 开发库上回滚式业务风险和 API 权限测试 |
| `scripts/run-on-remote-db.sh <supabase 子命令>` | 把任意 Supabase CLI 子命令接到开发库 URL |
| `scripts/sync-production-to-dev.sh` | 用 production 业务数据覆盖开发库 |
| `scripts/cleanup-remote-supabase-images.sh` | 删除开发机上未被容器引用的 Supabase 镜像 |

前端门禁是 `npm run check`。动 schema 或账本语义时再加上 `test:db`、`db:lint` 和 `git diff --check`。

## Schema

`supabase/migrations/*.sql` 是唯一事实源，只加 forward-only migration。
不要另写 `schema.sql`。控制台临时修复必须补 migration。

`supabase/seed.sql` 只用于可丢弃的开发数据。不要对 production 或有真实数据的开发库
`db reset`。

## 开发库

```bash
npm run db:start      # 容器未运行时
npm run db:migrate
npm run test:db
npm run db:lint
```

## production

始终先 dry-run：

```bash
supabase db push --linked --dry-run
supabase db push --linked
```

直连项目 endpoint 通常要 IPv6。IPv4-only 从 Dashboard → Connect 复制 Session Pooler
URL（端口 `5432`），用完即弃，不要保存或提交：

```bash
supabase db push --db-url '<SESSION_POOLER_URL>' --dry-run
supabase db push --db-url '<SESSION_POOLER_URL>'
```

## Production 数据 → 开发库

```bash
./scripts/sync-production-to-dev.sh
```

覆盖前必须输入 `SYNC dev`。脚本会：导出并校验 production 五张业务表；启动精简栈；
给开发库做 migration 和覆盖前备份；单事务导入；校验账本不变量。
COPY 导入仍走开发库容器里的 `psql`（本机没有客户端）。

备份在 gitignore 目录，含 PIN 和账本，不能提交或公开：

```text
.local-backups/production-sync/production-YYYYMMDDTHHMMSSZ/
├── public-data.sql
├── public-data.sql.sha256
├── dev-before-sync.sql
└── dev-before-sync.sql.sha256
```

回滚（会再次覆盖开发库）：

```bash
FSL_SYNC_DIR="$PWD/.local-backups/production-sync/production-YYYYMMDDTHHMMSSZ"
(cd "$FSL_SYNC_DIR" && shasum -a 256 -c dev-before-sync.sql.sha256)

docker exec supabase_db_family-saving-ledger psql -U postgres -d postgres \
  -v ON_ERROR_STOP=1 \
  -c 'TRUNCATE TABLE public.interest_log, public.transactions, public.accounts, public.app_users, public.settings CASCADE;'
docker exec -i supabase_db_family-saving-ledger psql -U postgres -d postgres \
  --single-transaction --set ON_ERROR_STOP=on \
  --command 'SET session_replication_role = replica;' \
  --file - < "$FSL_SYNC_DIR/dev-before-sync.sql"

unset FSL_SYNC_DIR
```

不要使用 `supabase stop --no-backup` 或 `docker system prune --volumes`。

## API 权限

`20260726165000_restore_api_privileges.sql` 维护 API 对象权限。
`run_monthly_interest()` 与 `run_monthly_interest_impl()` 不允许
`anon` / `authenticated` 执行，由 postgres cron / `service_role` 结算。
`supabase/tests/api_privileges.sql` 验证角色权限。
