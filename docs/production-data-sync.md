# Production → 远程开发环境

## 同步

```bash
./scripts/sync-production-to-remote.sh
```

脚本固定使用当前 Supabase linked project，以及名为 `remote` 的 SSH Docker context。
覆盖前必须输入 `SYNC remote`。

脚本会：

1. 导出并校验 production 五张业务表。
2. 通过远程 Docker context 启动四服务精简栈。
3. 增量应用远程开发库 migrations。
4. 备份远程开发库当前数据。
5. 单事务恢复 production 数据并验证账本不变量。

## 备份

每次同步保存到：

```text
.local-backups/production-sync/production-YYYYMMDDTHHMMSSZ/
├── public-data.sql
├── public-data.sql.sha256
├── remote-before-sync.sql
└── remote-before-sync.sql.sha256
```

目录已被 Git 忽略，但文件包含 PIN 和账本数据，不能提交或公开。

## 验证

```bash
npm run test:db
npm run db:lint
npm run check
```

## 回滚

回滚会覆盖远程开发库，先选择正确的同步目录：

```bash
FSL_SYNC_DIR="$PWD/.local-backups/production-sync/production-YYYYMMDDTHHMMSSZ"
(cd "$FSL_SYNC_DIR" && shasum -a 256 -c remote-before-sync.sql.sha256)

docker exec supabase_db_family-saving-ledger psql -U postgres -d postgres \
  -v ON_ERROR_STOP=1 \
  -c 'TRUNCATE TABLE public.interest_log, public.transactions, public.accounts, public.app_users, public.settings CASCADE;'
docker exec -i supabase_db_family-saving-ledger psql -U postgres -d postgres \
  --single-transaction --set ON_ERROR_STOP=on \
  --command 'SET session_replication_role = replica;' \
  --file - < "$FSL_SYNC_DIR/remote-before-sync.sql"

unset FSL_SYNC_DIR
```

不要使用 `supabase stop --no-backup`。
