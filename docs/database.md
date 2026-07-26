# 数据库迁移与运维

## 单一事实源

`supabase/migrations/*.sql` 定义 schema，包括表、函数、GRANT、default privileges、
RLS、policy 和视图安全属性。控制台临时修复必须补 forward-only migration。

`supabase/seed.sql` 只用于可丢弃的开发数据，不包含 production 数据。

## Migration

```bash
# jarvis 增量更新
supabase migration list --local
supabase migration up --local

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
- 金额为正；扣减和转出不能产生负余额。
- 转账账户不同、币种相同，两行共享 group ID 并共同作废。
- 作废交易不计入余额和利息。
- 账户关闭、孩子归档要求权威余额为零并保留历史。
- 月度结息按账户/月幂等；并发多行操作按 UUID 确定顺序加锁。

## API 权限

`20260726165000_restore_api_privileges.sql` 维护 API 对象权限；内部
`run_monthly_interest_impl()` 不允许 `anon/authenticated` 执行。
`supabase/tests/api_privileges.sql` 验证数据库角色和实际读取权限。

数据库或权限变化后运行：

```bash
npm run test:db
supabase db lint --local --level warning
```

production 数据同步见 [Production → jarvis-sg](production-data-sync.md)。
