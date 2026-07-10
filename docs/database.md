# 数据库迁移与运维

## 单一事实源

数据库结构由 `supabase/migrations/*.sql` 按时间顺序定义。不要维护独立的完整 schema 快照；它会与真实迁移历史产生漂移。

`supabase/seed.sql` 只用于本地开发 reset，不应包含生产数据。

## 本地迁移

查看和应用尚未执行的 migration：

```bash
supabase migration list --local
supabase migration up --local
```

从零验证全部 migration：

```bash
supabase db reset --local
npm run test:db
```

`db reset` 会清空本地数据。已有本地账本时不要用它代替 `migration up --local`。

## 远程迁移

先只查看计划：

```bash
supabase db push --linked --dry-run
```

Supabase 的直接数据库地址默认要求 IPv6。IPv4-only 网络出现 `TLS EOF` 或直连失败时，从 Dashboard 的 **Connect** 页面复制 Session Pooler URL（端口 `5432`）：

```bash
supabase db push --db-url '<SESSION_POOLER_URL>' --dry-run
supabase db push --db-url '<SESSION_POOLER_URL>'
```

不要把数据库密码写入仓库、shell 脚本或文档。

## 核心不变量

- `app_users.role` 只能是 `parent` 或 `child`；只有活跃家长可调用修改型 RPC。
- 账户币种在创建后保持稳定；交易币种必须匹配账户。
- 余额只统计未作废交易；扣减和转出为负向，其余为正向。
- 转账使用同一个 `transfer_group_id` 形成一进一出，金额和币种一致，并共同作废。
- 账户关闭和孩子归档必须在锁内重新计算权威余额，余额非零时拒绝。
- 结息按账户和月份幂等，并通过确定性锁顺序避免并发重复。

## 数据同步

远程数据覆盖本地前必须：

1. 确认关联项目。
2. 确认本地和远程 migration 兼容。
3. 导出同步前本地备份。
4. 验证远程 dump 只包含预期表。
5. 使用 `ON_ERROR_STOP` 和单事务导入。
6. 对比核心表行数，并运行 `npm run test:db`。

dump 文件和本地备份都可能包含明文 PIN 与账本数据，用完后应删除。
