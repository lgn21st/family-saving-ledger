# Production → jarvis-sg

## 同步

```bash
./scripts/sync-production-to-jarvis.sh
```

脚本固定使用当前 Supabase linked project、`remote → ssh://jarvis-sg` Docker
context，以及 `jarvis-supabase` 应用隧道 alias。覆盖前必须输入
`SYNC jarvis-sg`。

脚本会：

1. 导出并校验 production 五张业务表。
2. 通过 `jarvis-supabase` 建立 SSH 隧道并启动四服务精简栈。
3. 增量应用 jarvis migrations。
4. 备份 jarvis 当前数据。
5. 单事务恢复 production 数据并验证账本不变量。

## 备份

每次同步保存到：

```text
.local-backups/production-sync/production-YYYYMMDDTHHMMSSZ/
├── public-data.sql
├── public-data.sql.sha256
├── jarvis-before-sync.sql
└── jarvis-before-sync.sql.sha256
```

目录已被 Git 忽略，但文件包含 PIN 和账本数据，不能提交或公开。

## 验证

```bash
npm run test:db
supabase db lint --local --level warning
npm run check
```

## 回滚

回滚会覆盖 jarvis，先选择正确的同步目录：

```bash
FSL_SYNC_DIR="$PWD/.local-backups/production-sync/production-YYYYMMDDTHHMMSSZ"
(cd "$FSL_SYNC_DIR" && shasum -a 256 -c jarvis-before-sync.sql.sha256)

docker exec supabase_db_family-saving-ledger psql -U postgres -d postgres \
  -v ON_ERROR_STOP=1 \
  -c 'TRUNCATE TABLE public.interest_log, public.transactions, public.accounts, public.app_users, public.settings CASCADE;'
docker exec -i supabase_db_family-saving-ledger psql -U postgres -d postgres \
  --single-transaction --set ON_ERROR_STOP=on \
  --command 'SET session_replication_role = replica;' \
  --file - < "$FSL_SYNC_DIR/jarvis-before-sync.sql"

unset FSL_SYNC_DIR
```

不要使用 `supabase stop --no-backup`。
