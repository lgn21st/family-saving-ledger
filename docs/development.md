# 开发与验证

数据库命令、数据库 production 发布和数据同步见 [数据库与运维](database.md)。

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
docker context create remote --docker host=ssh://<REMOTE_SSH_ALIAS>
docker context use remote
docker --context remote version
```

`context create` 只需首次执行；已有配置用 `docker context inspect remote` 检查目标。
Context 保存在 `${DOCKER_CONFIG:-$HOME/.docker}`，安装 CLI 或拉取仓库不会创建它。
缺失时先检查 SSH 连通性，再创建；选择异常时检查 `DOCKER_HOST`、`DOCKER_CONTEXT`、
`DOCKER_CONFIG` 是否覆盖本机配置。Docker 的 SSH 通道与 API/PostgreSQL 直连分别检查。

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

前端验证：`npm run check`（含测试文件的 TypeScript 检查）。数据库验证见 [数据库与运维](database.md)。

## 前端发布与验收

前端由 Vercel 托管，生产入口是 <https://family-saving-ledger.vercel.app>。
`main` 的发布状态在 GitHub 对应提交的 Vercel 状态及 Production deployment 中查看；
验收时核对部署 SHA 与预期提交，再检查生产入口，不只检查构建完成状态。

发布前运行 `npm run check`，提交后推送 `main`。Vercel 使用云端生产环境变量构建，
不要上传本机连接开发库的 `dist/`。前端构建不会执行数据库 migration；需要时按数据库文档另行发布。

发布后检查登录、余额、历史分页和刷新；在手机上检查安装、键盘遮挡及返回前台。
PWA 在启动和回到前台时检查新版本，无编辑弹层、设置草稿和待确认交易时自动升级；静态资源可离线加载，
账本读取和写入仍需要 Supabase。失败时应显示错误或重试入口，不应把加载失败显示成空账本。

旧版 PWA 首次升级到此机制时，旧页面尚无更新检查逻辑：需先完整关闭主屏幕应用及
同站浏览器标签页，再打开。若此次打开才下载新版本，下载完成后再关闭、打开一次。
后续版本在回到前台且没有未完成编辑时自动升级；仅切到后台不等于关闭页面。

## 网络边界

开发主机上的 `fsl-supabase-firewall.service` 在 Docker 启动后维护 `DOCKER-USER` 规则：
允许 tailnet 访问 TCP `54321/54322`，拒绝其他网卡，覆盖 IPv4/IPv6。
按 `--ctorigdstport` 限制入站时，DROP 规则必须同时匹配 `--ctdir ORIGINAL`；
否则从 Docker bridge 返回的回复包也会被丢弃，造成 Tailscale 直连超时。

```bash
ssh <REMOTE_SSH_ALIAS> 'systemctl status fsl-supabase-firewall.service --no-pager'
ssh <REMOTE_SSH_ALIAS> 'iptables -S FSL-SUPABASE; ip6tables -S FSL-SUPABASE'
```

不要只依赖 UFW。Tailscale 给开发主机 `tag:remote-dev`，Grants 只开放需要的端口；
保存前删掉覆盖同一目标的 allow-all 规则。SSH 是 tailnet 上的普通 OpenSSH，不必开 Tailscale SSH。
