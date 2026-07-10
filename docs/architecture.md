# 架构与依赖边界

## 运行时结构

```text
App.vue
  └─ app/useLedgerApp.ts        页面装配与跨功能协调
       ├─ composables/*         数据访问、业务动作、派生状态
       ├─ config/*              静态产品配置
       ├─ types/domain.ts       账本领域模型
       ├─ types/supabase.ts     Supabase 最小适配接口
       └─ supabaseClient.ts     基础设施客户端

components/*                    通过 props/callbacks 接收状态和动作
supabase/migrations/*           最终业务约束、并发控制和审计
```

依赖方向应保持从 UI 指向应用装配、再指向 composables 和基础设施。组件不得直接访问 Supabase；跨表约束、余额校验和并发一致性必须由数据库 RPC 保证。

## 目录职责

### `src/app/`

页面级装配层。允许组合多个 composable、维护跨功能选择状态、处理浏览器确认框和生命周期。不要在这里重新实现数据库业务规则。

### `src/components/`

展示与输入边界。组件使用类型化 props、具名 `v-model` 和显式 callback props。组件应能通过 props 独立测试，不直接导入 Supabase 客户端。

### `src/composables/`

按能力拆分：认证、用户、账户、交易、转账、状态、选择同步和图表。仅当逻辑具备独立职责或可测试行为时创建 composable；不要为单个 `computed` 或一行函数增加包装层。

### `src/types/`

- `domain.ts`：应用与数据库共享的领域概念。
- `supabase.ts`：应用实际使用的最小客户端接口，便于测试替换。
- `index.ts`：稳定导出入口。

### `supabase/`

`migrations/` 是数据库结构唯一事实源。`seed.sql` 只提供可丢弃的本地开发数据；`tests/` 验证角色、余额、转账、作废、关闭、归档和利息等数据库不变量。

## 状态与数据流

1. `useLedgerApp` 启动登录用户和会话恢复。
2. 用户变化触发账户与孩子数据加载。
3. 账户选择触发分页流水、图表窗口和余额刷新。
4. 修改操作调用数据库 RPC；成功后重新读取权威余额与流水。
5. `ParentDashboard` 和 `ChildDashboard` 只渲染传入状态并转发用户动作。
6. `SettingsPage` 承载成员与账户生命周期管理；工作台只保留查看、选择、记账和转账。

## 重构边界

- 保持数据库 RPC 名称和参数稳定，除非同步修改 migration、数据库测试和前端调用。
- 不用前端余额代替数据库余额做最终校验。
- 不物理删除孩子、账户、转账对或审计记录。
- 避免把 `useLedgerApp` 继续拆成没有独立行为的薄包装；只有出现清晰功能边界时才新增目录或 composable。
