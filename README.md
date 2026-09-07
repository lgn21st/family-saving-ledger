# Family Saving Ledger

面向家庭内部使用的储蓄账本 PWA。家长负责开户、记账、同币种转账、账户关闭和孩子归档；孩子以只读方式查看余额与流水。后端使用 Supabase，并按月结算利息。

## 快速开始

项目固定使用 Node.js 24.20.0（LTS）和 npm 12；通过 `mise.toml` 管理 Node 版本。

```bash
mise install
npm install --global npm@12.0.2
npm ci
docker context use remote
npm run db:start
npm run db:migrate
npm run dev
```

创建 `.env.local`：

```bash
VITE_SUPABASE_URL=http://<REMOTE_MAGICDNS_NAME>:54321
VITE_SUPABASE_ANON_KEY=<supabase status 输出的本地 anon key>
```

本机与远程开发主机必须加入同一 Tailscale 网络并启用 MagicDNS。日常数据库更新使用
`npm run db:migrate`；重建会清空远程开发数据，操作前必须确认并备份。

## 质量门禁

```bash
npm run check     # lint + unit tests + typecheck/build
npm run test:db   # 回滚式数据库业务风险测试
npm run db:lint   # 远程开发数据库 schema lint
```

## 项目结构

```text
src/
├── app/            # 应用装配、页面状态和跨功能协调
├── components/     # 展示与交互组件
├── composables/    # 可独立测试的业务/UI 能力
├── config/         # 币种与头像等静态配置
├── types/          # 领域类型与 Supabase 边界类型
└── test/           # 测试运行时配置
supabase/
├── migrations/     # 数据库结构唯一事实源
├── tests/          # 数据库集成测试
└── seed.sql        # 仅用于本地 reset 的开发数据
docs/               # 架构、开发、数据库和审查记录
skills/             # 可版本化、可安装的项目专用 Codex skills
```

## 文档

- [架构与依赖边界](docs/architecture.md)
- [本地开发与质量门禁](docs/development.md)
- [数据库迁移与运维](docs/database.md)
- [2026-07-10 系统审查](docs/system-review-2026-07-10.md)

## 核心规则

- 只有活跃家长可以修改账本；孩子只读。
- 交易金额必须为正，扣减与转出不能造成负余额。
- 转账双方必须是不同的活跃同币种账户，并作为一组共同作废。
- 已作废交易不计入余额和利息。
- 账户和孩子只能在权威余额为零时关闭或归档，历史账本始终保留。
- 每个账户每个月最多产生一笔有效利息交易和一条利息审计记录。

本项目目前采用家庭内部可信边界下的 PIN 登录，不应直接扩展为公开多租户服务。
