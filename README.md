# Family Saving Ledger

面向家庭内部使用的储蓄账本 PWA。家长开户、记账、同币种转账、关户和归档孩子；孩子只读查看余额与流水。后端是 Supabase，按月结息。

PIN 登录和当前 RLS 模型只适合可信家人，不要当成公开多租户系统。

## 从这里读

| 文档 | 内容 |
| --- | --- |
| [开发与验证](docs/development.md) | 工具链、`.env.local`、Tailscale、日常 `npm run dev` |
| [数据库与运维](docs/database.md) | migration、production、脚本、prod→开发库 |
| [架构](docs/architecture.md) | 分层、页面、composable、数据流 |
| 账本规则 | `.agents/skills/family-ledger-domain/references/ledger-model.md` |
