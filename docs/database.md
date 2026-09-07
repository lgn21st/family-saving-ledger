# 数据库迁移与运维

## 单一事实源

`supabase/migrations/*.sql` 定义 schema，包括表、函数、GRANT、default privileges、
RLS、policy 和视图安全属性。控制台临时修复必须补 forward-only migration。

`supabase/seed.sql` 只用于可丢弃的开发数据，不包含 production 数据。

## Migration

```bash
# 远程开发库增量更新（通过 Tailscale）
npm run db:migrate

# production：先 dry-run
supabase db push --linked --dry-run
supabase db push --linked
```

IPv4-only 网络使用 Dashboard Connect 的 Session Pooler URL：

```bash
supabase db push --db-url '<SESSION_POOLER_URL>' --dry-run
supabase db push --db-url '<SESSION_POOLER_URL>'
```

不要保存或提交包含数据库密码的 URL。不要用 `db reset` 代替日常增量 migration。

## 账本不变量

- 只有活跃家长可通过修改型 RPC 操作账本。
- 金额为正；扣减、转出和作废都不能产生负余额。
- 转账账户不同、币种相同，两行共享 group ID 并共同作废。
- 作废交易不计入余额和利息；已关闭账户上的交易不可作废。
- 账户关闭、孩子归档要求权威余额为零并保留历史。
- 月度结息按账户/月幂等，补结时利息入账时间为下月月初；并发多行操作按 UUID 确定顺序加锁。
- 创建/更新孩子和账户走 `create_child`、`update_child_name`、`create_account`、`update_account_name`。

## API 权限

`20260726165000_restore_api_privileges.sql` 维护 API 对象权限；
`run_monthly_interest()` 与内部 `run_monthly_interest_impl()` 都不允许
`anon/authenticated` 执行，由 postgres cron / `service_role` 结算。
`supabase/tests/api_privileges.sql` 验证数据库角色和实际读取权限。

数据库或权限变化后运行：

```bash
npm run test:db
npm run db:lint
```

production 数据同步见 [Production → 远程开发环境](production-data-sync.md)。
