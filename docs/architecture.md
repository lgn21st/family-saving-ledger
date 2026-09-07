# 架构与依赖边界

环境见 [开发与验证](development.md)，数据库命令见 [数据库与运维](database.md)，
账本规则见 `.agents/skills/family-ledger-domain/references/ledger-model.md`。

## 依赖方向

```text
components → app 装配 → composables → Supabase client
                       ↘ domain / config 类型
```

组件不得访问 Supabase。余额、角色、并发一致性由数据库 RPC 保证。

## 运行时结构

```text
src/main.ts                 Vue 与 service worker
src/App.vue                 登录页 / 应用壳，只做 props 接线
src/app/useLedgerApp.ts     页面状态、生命周期、跨功能协调
src/supabaseClient.ts       环境检查与客户端
src/utils/timezone.ts       账本时区下的日切窗口
src/types/domain.ts         领域模型
src/types/supabase.ts       测试可替换的最小客户端接口
src/__tests__/              前端测试；mock Supabase 边界
```

## 页面

- `LoginPage`：选人、PIN
- `AppShell`：登录后的页头、状态、布局
- `ParentDashboard`：选择、余额、记账与转账
- `ChildDashboard`：只读
- `SettingsPage`：家长管理成员和账户生命周期
- `LedgerNavigatorPanel` / `ChildAccountNavigatorPanel`：资产与账户导航
- `QuickTransactionSheet`：存、取、同币种转账

## 能力（composables）

- 数据：`useUsers`、`useAccounts`、`useTransactions`
- 动作：`useAuth`、`useChildren`、`useAccountEditor`、`useTransactionActions`、`useTransfers`
- 选择/会话：`useAccountSelection`、`useSelectionSync`、`useSession`、`useBootstrap`
- 展示：`useCurrency`、`useTransactionDisplay`、`useChartData`、`useStatus`

只在确有独立职责或可测行为时新增 composable，不要包一层转发。

## 目录职责

`src/app/` 组合 composable、跨功能选择、确认框和生命周期，不实现数据库规则。

`src/components/` 类型化 props、具名 `v-model`、显式 callback；可独立测试。

`src/types/domain.ts` 与数据库共享的概念；`src/types/supabase.ts` 给测试替换用。

`supabase/migrations/` 是 schema 唯一事实源。`seed.sql` 可丢弃。`supabase/tests/` 验证数据库不变量。

## 数据流

1. `useLedgerApp` 恢复会话或登录。
2. 用户变化 → 拉账户和孩子。
3. 选中账户 → 分页流水、图表、余额。
4. 修改走 RPC；成功后再读权威余额和流水。
5. 工作台只做查看、选择、记账、转账；生命周期在设置页。

## 重构边界

- 改 RPC 名称或参数时，同步 migration、数据库测试和前端调用。
- 不用前端余额做最终校验。
- 不物理删除孩子、账户、转账对或审计记录。
- 不要把 `useLedgerApp` 拆成没有独立行为的薄包装。
