# 开发与验证

数据库命令、production 发布和数据同步见 [数据库与运维](database.md)。

## 工具链

- Node.js 24.20.0（LTS）、npm 12；`mise.toml` 与 `package.json` 的 `engines.node` `24.x` 对齐 Vercel
- TypeScript `~6.0.3`（TypeScript 7 尚不被当前 ESLint / Vue 工具链支持）
- Supabase CLI、独立 Docker CLI
- 本机与开发主机加入同一 Tailscale 网络并启用 MagicDNS
- Docker context `remote` → `ssh://<REMOTE_SSH_ALIAS>`

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

## 日常开发

开发主机跑 PostgreSQL、GoTrue、Kong、PostgREST。本机经 Tailscale 直连，无需 SSH 隧道：

- API：`http://<REMOTE_MAGICDNS_NAME>:54321`
- PostgreSQL：`<REMOTE_MAGICDNS_NAME>:54322`

`.env.local`：

```dotenv
VITE_SUPABASE_URL=http://<REMOTE_MAGICDNS_NAME>:54321
VITE_SUPABASE_ANON_KEY=<SUPABASE_LOCAL_ANON_KEY>
```

```bash
npm run db:start      # 容器未运行时
npm run dev
```

前端验证：`npm run check`。数据库验证见 [数据库与运维](database.md)。

## 网络边界

开发主机上的 `fsl-supabase-firewall.service` 在 Docker 启动后维护 `DOCKER-USER` 规则：
允许 tailnet 访问 TCP `54321/54322`，拒绝其他网卡，覆盖 IPv4/IPv6。

```bash
ssh <REMOTE_SSH_ALIAS> 'systemctl status fsl-supabase-firewall.service --no-pager'
ssh <REMOTE_SSH_ALIAS> 'iptables -S FSL-SUPABASE; ip6tables -S FSL-SUPABASE'
```

不要只依赖 UFW。Tailscale 给开发主机 `tag:remote-dev`，Grants 只开放需要的端口；
保存前删掉覆盖同一目标的 allow-all 规则。SSH 是 tailnet 上的普通 OpenSSH，不必开 Tailscale SSH。
