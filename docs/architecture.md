# 架构

功能拥有自己的草稿、校验、编辑和提交状态；顶层只装配共享能力。

| 位置 | 职责 |
| --- | --- |
| `src/app/useLedgerApp.ts` | 依赖装配、导航、命令成功后的刷新协调 |
| `src/features/` | 成员、账户、记账界面及各自可独立测试的状态逻辑 |
| `src/features/contracts.ts` | 功能需要的只读共享数据与显式命令 |
| `useAuth` / `useLedgerData` | 会话、成员、账户、权威余额及账本时区 |
| `useAccountSelection` / `useAccountHistory` | 有效选择、流水分页、图表和作废 |
| `src/components/` | 页面布局和可复用展示；不查询 Supabase |
| `src/types/` | `domain.ts`：领域与命令类型；`supabase.ts`：客户端契约 |

## 写入与刷新

功能提交具体值，例如 `addTransaction({ accountId, type, amount, note })`。
`useLedgerCommands` 固定操作人和输入，调用 RPC，再通过 `LedgerChange` 刷新：

- 成员变更：成员及登录列表；归档还刷新账户。
- 账户变更：账户及余额，重新协调有效选择。
- 交易变更：余额及所选账户流水、图表。

数据库 RPC 负责最终角色、余额和并发校验。写入已提交而刷新失败时返回成功及
`warning`，清理已提交草稿并提示刷新失败，避免引导重复写入。
存取款和转账先在浏览器保存操作人、请求 ID 和原始输入，再提交 RPC。网络结果不确定时
保留恢复信息并阻止新记账；重开弹层或刷新后可确认原交易。数据库按操作人和请求 ID
返回原交易，相同 ID 的不同输入被拒绝；明确失败或确认成功后清除恢复信息。
另一标签页清除记录后，当前页确认仍使用原 ID；若发现新的待确认操作，先展示该操作。
旧会话的异步结果不能覆盖新会话数据或发布反馈。

## 生命周期与扩展

设置分类通过 `v-show` 保留各自草稿；离开设置页、退出登录或关闭记账弹层后销毁草稿。
切换孩子后，旧账户创建结果不能清空新孩子的草稿。

局部字段和交互只改对应功能，不修改顶层；新增共享事实或跨功能影响才扩展契约。
单处使用且仅转发 props、事件的组件应合并；目录和 composable 要有实际职责。

验证命令见 [AGENTS.md](../AGENTS.md)，环境见 [开发](development.md)，
数据库操作见 [运维](database.md)，账本规则见
[ledger-model.md](../.agents/skills/family-ledger-domain/references/ledger-model.md)。
