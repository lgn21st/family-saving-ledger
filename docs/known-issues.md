# 已解决问题

## REMOTE-DOCKER-001：jarvis Supabase 开发环境

- 状态：已解决（2026-07-26）
- 环境：2 GiB jarvis-sg、Docker SSH context `remote`

### 问题

- 完整 Supabase 栈资源占用过高。
- Docker context 不会转发本机所需的 `54321/54322` 端口。
- production 曾在网页控制台手工修复权限，migration 未同步，导致 jarvis REST 返回
  `permission denied`。

### 修复

- 只运行 PostgreSQL、GoTrue、Kong、PostgREST，并通过 SSH 转发端口。
- 用 `20260726165000_restore_api_privileges.sql` 固化 GRANT/default privileges；
  production 已完成 push。
- production 与 jarvis schema 一致，数据库测试、五个 REST 入口和浏览器登录均通过。
- 删除未使用的 Supabase 可选服务镜像后，根磁盘使用率从 80% 降至 54%。

### 约束

- 权限、RLS、函数和视图安全设置必须进入 forward-only migration，不在控制台长期维护。
- production push 使用 IPv4 Session Pooler，并始终先运行 `--dry-run`。
- 不运行 Studio、Storage、Realtime 等可选服务时，使用四服务精简栈。
- 不执行 `supabase stop --no-backup` 或 `docker system prune --volumes`。
