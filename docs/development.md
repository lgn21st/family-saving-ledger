# 本地开发与质量门禁

## 工具链

- Node.js 24（`.nvmrc`、`mise.toml`）
- npm 11（`packageManager` 与 `engines`）
- Supabase CLI 与 Docker Desktop

```bash
mise install
npm install
```

## 本地服务

```bash
supabase start
supabase status
supabase migration up --local
npm run dev
```

常用地址默认是：应用 `http://127.0.0.1:5173`、API `http://127.0.0.1:54321`、Postgres `54322`、Studio `http://127.0.0.1:54323`。

## 数据库重建

```bash
supabase db reset --local
```

该命令会删除本地数据、从头应用全部 migration，再执行 `supabase/seed.sql`。只有在确认本地数据可丢弃时使用。

## 测试

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:db
```

提交前运行：

```bash
npm run check
npm run test:db
git diff --check
```

单元测试位于 `src/__tests__/`，使用 Vitest 与 Testing Library。数据库测试位于 `supabase/tests/`，通过事务运行并回滚，不应残留测试数据。

## 变更规则

- UI 或 composable 变化：更新对应单元测试。
- RPC、表、约束或视图变化：新增 migration，并同步数据库测试。
- 数据库业务语义变化：同步 `docs/database.md` 和项目 domain skill。
- 目录或常用命令变化：同步 `README.md`、`AGENTS.md` 和相关 skill。

## Git

提交消息采用 `type: description`，常用类型为 `feat`、`fix`、`refactor`、`test`、`docs`、`chore`。提交应按工具链、业务行为和文档等逻辑边界拆分。
