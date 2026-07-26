# 开发与验证

## 环境

- Node.js 24、npm 11
- Supabase CLI、独立 Docker CLI
- Docker context `remote` → `ssh://jarvis-sg`

```bash
mise install
npm install
docker context use remote
```

## 日常开发

jarvis 上运行 PostgreSQL、GoTrue、Kong、PostgREST。本机 Docker CLI 通过
`remote` context 管理容器；前端和数据库工具通过 SSH 隧道访问：

- Supabase API：`http://localhost:54321`
- PostgreSQL：`localhost:54322`

建立隧道并启动前端：

```bash
ssh -M \
  -S /tmp/family-saving-ledger-supabase-tunnel.sock \
  -fN \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=15 \
  -o ServerAliveCountMax=6 \
  -L 54321:127.0.0.1:54321 \
  -L 54322:127.0.0.1:54322 \
  jarvis-sg

npm run dev
```

`.env.local` 应将 `VITE_SUPABASE_URL` 指向 `http://localhost:54321`。结束开发时
停止前端并关闭隧道，无需停止 jarvis 容器：

```bash
ssh -S /tmp/family-saving-ledger-supabase-tunnel.sock -O exit jarvis-sg
```

如果 jarvis 容器未运行，先建立隧道，再启动精简栈：

```bash
supabase start --exclude edge-runtime,imgproxy,logflare,mailpit,postgres-meta,realtime,storage-api,studio,supavisor,vector
```

只有需要用 production 数据覆盖 jarvis 开发数据时才运行：

```bash
./scripts/sync-production-to-jarvis.sh
```

该脚本会建立隧道、启动精简栈、备份 jarvis 数据，并在明确确认后执行覆盖。
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
