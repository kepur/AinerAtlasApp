# AinerSpeak — 给其他 Agent 的部署提示词

> 复制下面整段给部署 Agent 即可。完整说明见 [DEPLOY.md](./DEPLOY.md)。

---

```
你是部署 Agent，请在目标机器上部署 AinerSpeak（本仓库）。

【仓库】git clone 后进入仓库根目录（含 docker-compose.yml、DEPLOY.md、deploy-snapshot/）。

【默认端口 — 宿主机映射，可自定义避免冲突】
- API:      7070  → 容器 8000    健康检查 GET /health
- Web H5:   7075  → 容器 7075(dev) 或 80(prod)
- Admin:    7072  → 容器 80
- Postgres: 7073  → 容器 5432
- Redis:    7074  → 容器 6379
- Admin Vite 本地开发（非 Docker）: 7076

若端口被占用：只改 docker-compose.yml 左侧宿主机端口（详见 DEPLOY.md §12），并同步：
- .env / .env.development 的 CORS_ORIGINS（含新 Web/Admin 源）
- 生产 Web 构建：VITE_API_BASE_URL 指向新 API 地址

【推荐：一键复刻当前环境（含数据库与 Admin 配置）】
1. cp .env.example .env
2. chmod +x scripts/import-deploy-snapshot.sh
3. ./scripts/import-deploy-snapshot.sh
4. curl -s http://localhost:7070/health
   期望：{"status":"ok","service":"ainerspeak-api"}
5. 浏览器打开：
   - Web:   http://localhost:7075
   - Admin: http://localhost:7072

【全新环境（无快照）】
cp .env.example .env
docker compose up -d --build

【生产静态前端】
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

【默认登录】
- H5 Demo: demo@ainerspeak.com / Demo123!
- Admin:   admin@ainerspeak.com / ChangeMe123!

【生产安全】
- 修改 JWT_SECRET、ENCRYPTION_KEY
- CORS_ORIGINS 改为真实域名（参考 .env.production）
- PLAINTEXT_API_KEYS=false

【持久化】
- Postgres / Redis：Docker named volume
- 上传与 TTS 缓存：./storage、./apps/api/uploads（bind mount）

【验收】
- API /health
- Web 登录并发一条聊天见 HUD
- /voice 语音教练可连接
- Admin Providers / Voice Platform 有配置

【文档】DEPLOY.md · deploy-snapshot/README.md · README.md Docker 端口表
```
