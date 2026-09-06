# 已解决问题

## REMOTE-DOCKER-001：远程 Supabase 开发环境

- 状态：已解决（2026-07-26）
- 环境：小规格远程主机、Docker SSH context `remote`

### 问题

- 完整 Supabase 栈资源占用过高。
- Docker context 不会转发应用端口，最初需要额外 SSH 隧道。
- production 曾在网页控制台手工修复权限，migration 未同步，导致远程开发环境 REST 返回
  `permission denied`。

### 修复

- 只运行 PostgreSQL、GoTrue、Kong、PostgREST；后续改为通过 Tailscale 直连。
- 远程主机的 `DOCKER-USER` 防火墙只允许 tailnet 访问 `54321/54322`，公网访问被拒绝。
- 用 `20260726165000_restore_api_privileges.sql` 固化 GRANT/default privileges；
  production 已完成 push。
- production 与远程开发库 schema 一致，数据库测试、五个 REST 入口和浏览器登录均通过。
- 删除未使用的 Supabase 可选服务镜像后，根磁盘使用率从 80% 降至 54%。

### 约束

- 权限、RLS、函数和视图安全设置必须进入 forward-only migration，不在控制台长期维护。
- production push 使用 IPv4 Session Pooler，并始终先运行 `--dry-run`。
- 不运行 Studio、Storage、Realtime 等可选服务时，使用四服务精简栈。
- Tailscale Grants 只允许开发设备访问 SSH、Supabase API 和 PostgreSQL 端口。
- 不执行 `supabase stop --no-backup` 或 `docker system prune --volumes`。
