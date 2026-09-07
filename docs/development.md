# 开发与验证

## 环境

- Node.js 26.8.1（Current）、npm 12
- Supabase CLI、独立 Docker CLI
- 本机与远程开发主机加入同一 Tailscale 网络，并启用 MagicDNS
- Docker context `remote` → `ssh://<REMOTE_SSH_ALIAS>`

在 `~/.ssh/config` 中配置远程管理 alias：

```sshconfig
Host <REMOTE_SSH_ALIAS>
  HostName <REMOTE_MAGICDNS_NAME>
  User <REMOTE_SSH_USER>
```

```bash
mise install
npm install --global npm@12.0.2
npm ci
docker context use remote
```

### 依赖升级说明（2026-09-07）

Node 从 24 升至 26.8.1，npm 固定为 12.0.2。Node 26 当前仍处于
[Current 阶段](https://github.com/nodejs/Release#release-schedule)，尚未进入 LTS。
Vue 3.5.42、Vite 8.2.2、Vitest 5.0.0、jsdom 30.0.1 及其余直接依赖
已核对 npm registry 的稳定版本，传递依赖随锁文件更新。

TypeScript 保留在 `~6.0.3`：实测 TypeScript 7.0.2 会导致当前
`typescript-eslint` 启动失败。TypeScript 7 尚未提供工具链需要的编译器 API，
参见[官方兼容说明](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0)。
待 Vue 类型检查和 ESLint 工具链支持后再升级；不要通过忽略 peer dependency 强行安装。

升级验证：lint、38 个测试文件中的 103 个测试、Vue 类型检查和 PWA 生产构建通过，
npm audit 为 0 漏洞。PWA 插件仍会产生 `inlineDynamicImports` 弃用提示，构建正常完成。
数据库业务风险及 API 权限集成测试均通过，
测试事务已回滚；数据库 lint 未发现 schema 错误。本次没有修改数据库结构或业务数据。

## 日常开发

远程开发主机运行 PostgreSQL、GoTrue、Kong、PostgREST。本机通过 Tailscale MagicDNS 直接访问：

- Supabase API：`http://<REMOTE_MAGICDNS_NAME>:54321`
- PostgreSQL：`<REMOTE_MAGICDNS_NAME>:54322`

`.env.local` 配置：

```dotenv
VITE_SUPABASE_URL=http://<REMOTE_MAGICDNS_NAME>:54321
VITE_SUPABASE_ANON_KEY=<SUPABASE_LOCAL_ANON_KEY>
```

无需建立或关闭 SSH 隧道，直接启动前端：

```bash
npm run dev
```

如果远程容器未运行：

```bash
npm run db:start
npm run db:migrate
```

Supabase CLI 的 `--local` 固定连接本机 loopback，不跟随远程 Docker context。项目的
`db:migrate`、`db:lint` 和 `test:db` 会从当前 Docker context 推导远程主机，
不会打印或保存数据库密码。

## 网络边界

远程主机上的 `fsl-supabase-firewall.service` 在 Docker 启动后维护 `DOCKER-USER` 规则：

- 允许 tailnet 访问 TCP `54321/54322`
- 拒绝其他网络接口访问这两个 Docker 发布端口
- 同时覆盖 IPv4 和 IPv6，并随 Docker 启动重新应用

检查状态：

```bash
ssh <REMOTE_SSH_ALIAS> 'systemctl status fsl-supabase-firewall.service --no-pager'
ssh <REMOTE_SSH_ALIAS> 'iptables -S FSL-SUPABASE; ip6tables -S FSL-SUPABASE'
```

修改 Docker 端口或服务器网络配置后，必须重新验证公网不可访问。不要只依赖 UFW；
Docker 发布端口应在 `DOCKER-USER` 链限制。

Tailscale 管理后台应给远程主机分配 `tag:remote-dev`，并使用 Grants 只开放所需端口：

```json
{
  "tagOwners": {
    "tag:remote-dev": ["autogroup:admin"]
  },
  "grants": [
    {
      "src": ["<YOUR_TAILSCALE_LOGIN>"],
      "dst": ["tag:remote-dev"],
      "ip": ["tcp:22", "tcp:54321", "tcp:54322"]
    }
  ]
}
```

Grants 是累加的；保存前应删除或收窄覆盖同一目标的 allow-all 规则，否则上面的端口限制
不会产生实际限制。这里的 SSH 是 Tailscale 网络上的普通 OpenSSH，不需要额外启用
Tailscale SSH policy。

## 数据同步与清理

只有需要用 production 数据覆盖远程开发库时运行：

```bash
./scripts/sync-production-to-remote.sh
```

详细流程见 [Production → 远程开发环境](production-data-sync.md)。清理未被容器引用的镜像：

```bash
./scripts/cleanup-remote-supabase-images.sh
```

## 验证

```bash
npm run check
npm run test:db
npm run db:lint
git diff --check
```

数据库测试在事务中运行并回滚。`db reset` 会删除远程开发数据并加载 seed，必须先确认。
历史排查结论见 [已解决问题](known-issues.md)。
