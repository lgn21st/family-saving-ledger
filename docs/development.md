# 开发与验证

## 环境

- Node.js 24、npm 11
- Supabase CLI、独立 Docker CLI
- Docker context `remote` → `ssh://jarvis-sg`
- SSH alias `jarvis-supabase` → jarvis 上的 Supabase API 和 PostgreSQL 隧道

SSH alias 使用本机已配置的 SSH agent 完成认证；仓库不保存私钥路径或凭据。
端口转发、control socket 和连接复用均由该 alias 定义，npm 任务不重复这些配置。

```bash
mise install
npm install
docker context use remote
```

## 日常开发

jarvis 上运行 PostgreSQL、GoTrue、Kong、PostgREST。本机 Docker CLI 通过
`remote` context 和 `jarvis-sg` 管理容器；前端和数据库工具通过
`jarvis-supabase` 隧道访问：

- Supabase API：`http://localhost:54321`
- PostgreSQL：`localhost:54322`

日常开发先建立并检查隧道，再启动前端：

```bash
npm run remote:up
npm run remote:status
npm run dev
```

`.env.local` 应将 `VITE_SUPABASE_URL` 指向 `http://localhost:54321`。结束开发时
停止前端并关闭隧道，无需停止 jarvis 容器：

```bash
npm run remote:down
```

两个 SSH alias 职责不同：`jarvis-sg` 供 Docker context 和远程管理使用；
`jarvis-supabase` 只负责应用端口转发。不要把 `LocalForward` 配到
`jarvis-sg`，以免 Docker CLI 的 SSH 连接参与隧道生命周期。

如果 jarvis 容器未运行，先建立隧道，再启动精简栈：

```bash
supabase start --exclude edge-runtime,imgproxy,logflare,mailpit,postgres-meta,realtime,storage-api,studio,supavisor,vector
```

只有需要用 production 数据覆盖 jarvis 开发数据时才运行：

```bash
./scripts/sync-production-to-jarvis.sh
```

该脚本会复用 `jarvis-supabase`、启动精简栈、备份 jarvis 数据，并在明确确认后
执行覆盖。
详细说明见 [Production → jarvis-sg](production-data-sync.md)。

需要停止远程服务但保留数据库 volume 时运行 `supabase stop`。

清理未被容器引用的 Supabase 镜像：

```bash
./scripts/cleanup-remote-supabase-images.sh
```

## 验证

```bash
npm run check
npm run test:db
supabase db lint --local --level warning
git diff --check
```

数据库测试在事务中运行并回滚。UI/composable 变更更新单元测试；数据库对象或账本
语义变更使用 forward-only migration，并更新数据库测试和 `docs/database.md`。

`supabase db reset --local` 会删除 jarvis 数据并重新加载 seed，必须先确认；日常增量
更新使用 `supabase migration up --local`。

历史排查结论见 [已解决问题](known-issues.md)。
