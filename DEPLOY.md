# AinerSpeak 部署与环境复刻指南

> **给 Agent / 运维**：阅读本文 + 仓库代码 + `deploy-snapshot/` 数据包，即可在空机器上复刻当前环境的全部功能（含 Admin 后台配置、会员方案、AI Provider、语音平台 VAD、游戏模板、用户与对话数据）。

---

## 1. 架构一览

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Web :7075  │  │ Admin :7072 │  │  API :7070  │
│  (Vite/H5)  │  │  (Nginx)    │  │  (FastAPI)  │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┴────────────────┘
                        │
            ┌───────────┴───────────┐
            │  Postgres :7073      │  ← Docker named volume `postgres_data`
            │  Redis :7074         │  ← Docker named volume `redis_data`
            └───────────┬───────────┘
                        │
            ┌───────────┴───────────┐  bind mounts（镜像外持久化）
            │  ./storage            │  TTS 缓存等
            │  ./apps/api/uploads   │  头像等上传文件
            └───────────────────────┘
```

| 组件 | 端口 | 持久化方式 |
|------|------|------------|
| API | 7070 | 无状态；配置在 Postgres |
| Web | 7075 | 开发：Vite 挂载源码；生产：静态镜像 |
| Admin | 7072 | 静态镜像 |
| Postgres | 7073 | **Docker volume** `postgres_data` |
| Redis | 7074 | **Docker volume** `redis_data` |
| 文件 | — | **宿主机目录** `./storage`、`./apps/api/uploads` |

**线上部署不需要**提交或打包：本地 SQLite（`*.db`）、`.env` 密钥、Docker volume 原始目录。这些已在 `.gitignore` 中忽略。

---

## 2. 数据包：`deploy-snapshot/`

| 文件 | 说明 |
|------|------|
| `manifest.json` | 元数据：导出时间、Git commit、各表行数、默认账号 |
| `database/ainerwise.sql.gz` | **主数据源**：完整 Postgres  dump |
| `files/storage/` | 与 `./storage` 同步 |
| `files/uploads/` | 与 `./apps/api/uploads` 同步 |
| `redis/dump.rdb` | Redis 快照（配额；可选） |
| `config/app_settings.json` | 语音平台 VAD、LLM 路由、语言列表（摘要） |
| `config/membership_plans.json` | 会员档位 |
| `config/ai_providers.json` | Provider 名称/端点（**不含** Key 明文） |
| `config/auth_settings.json` | Demo 模式、邮箱验证开关 |

**API Key** 存在 `ai_providers.api_key_encrypted` 中，随 SQL dump 一并恢复。开发环境通常 `PLAINTEXT_API_KEYS=true`（见 `.env.example`）。

---

## 3. 一键复刻（推荐）

### 前置条件

- Docker & Docker Compose
- Git 克隆本仓库（含 `deploy-snapshot/`）

### 步骤

```bash
# 1. 环境变量（从模板复制，按需填入 DashScope 等；若仅复刻 snapshot 可先用 mock）
cp .env.example .env

# 2. 导入快照并启动全栈
chmod +x scripts/import-deploy-snapshot.sh
./scripts/import-deploy-snapshot.sh

# 3. 验证
curl -s http://localhost:7070/health
# → {"status":"ok","service":"ainerspeak-api"}
```

### 默认账号（见 `manifest.json`）

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 超管 | `admin@ainerspeak.com` | `ChangeMe123!` |
| Demo VIP | `demo@ainerspeak.com` | `Demo123!` |

---

## 4. 手动部署（无快照 / 全新环境）

```bash
cp .env.example .env
docker compose up -d --build
```

API 容器启动时自动执行：

1. `alembic upgrade head` — 数据库迁移  
2. `seed_defaults()` — 种子 Admin、会员方案、游戏模板、Demo 用户  
3. **启动后 ~2s** — 自动写入推荐 VAD（`omni_silence_ms=1200`）  
4. **启动后 ~2s** — 若 Admin 开启 `voice_coach_startup_bootstrap` 且批处理未关闭，自动补跑语音教练画像  

**Admin 可配置**（应用设置 → 语音平台）：

- `omni_instructions` — 实时教练基础人设（与每日画像 `coach_identity` 合并注入 Omni）  
- `voice_coach_schedule` — `daily` / `weekly` / `off`  
- `voice_coach_vip_only` — 仅 VIP/Pro 参与自动批处理  
- `voice_coach_cron_hour` / `voice_coach_cron_minute` / `voice_coach_weekly_day`  
- `voice_coach_profile_ttl_hours` — 画像有效期  
- `voice_coach_startup_bootstrap` — API 启动时是否自动补跑  

保存应用设置后定时任务自动重载，无需手动 curl。

生产静态前端：

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

---

## 5. 更新快照（从当前运行环境导出）

```bash
# 需 Docker 栈正在运行
./scripts/export-deploy-snapshot.sh
git add deploy-snapshot/
git commit -m "chore: refresh deploy snapshot"
```

---

## 6. 环境变量要点

复制 `.env.example` → `.env`。与快照强相关项：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | Compose 内已覆盖为 Postgres；本地裸跑 API 时用 |
| `REDIS_URL` | 配额与限流 |
| `JWT_SECRET` | **生产必改** |
| `ENCRYPTION_KEY` | Fernet；与 dump 中加密 Key 对应；dev 可 `PLAINTEXT_API_KEYS=true` |
| `DASHSCOPE_*` | 阿里云百炼；Admin 已配置时可留空作 fallback |
| `CORS_ORIGINS` | 含 Web/Admin 源 |

完整列表见 `.env.example`。

---

## 7. Admin 后台已包含的配置（在 SQL dump 中）

复刻后登录 Admin `http://localhost:7072` 即可看到：

- **AI Providers** — DashScope / Mock 等及加密 Key  
- **Runtime Routing** — 默认 LLM / Voice / Embedding  
- **App Settings** — `voice_platform_config`（Omni 模型、VAD 1200ms、教练人设 `omni_instructions`）  
- **Membership Plans** — free / vip / pro  
- **Prompt Templates** — 思想对话、Freeze、游戏等  
- **Game Templates / Assets** — 海龟汤、狼人杀、恋爱社交等  
- **Users** — 含 Demo VIP、测试用户  
- **Voice Coach Profiles** — 日更教练画像（`user_voice_coach_profiles`）

可读摘要：`deploy-snapshot/config/*.json`。

---

## 8. 功能验收清单

| 功能 | 验证方式 |
|------|----------|
| API 健康 | `GET /health` |
| 登录 | Web 用 demo@ainerspeak.com |
| 文字聊天 + HUD | `/chat` → 进入会话，发消息见学习要点 |
| Freeze | ChatDetail 右上角 Freeze |
| 语音教练 | `/voice`，见「今日教练已了解你」，AI 先开口 |
| 通话小结 | 挂断后弹窗小结（非 Freeze） |
| 会员 / 微信二维码 | Membership 页 |
| Admin | 7072，admin 登录，检查 Providers / Voice Platform |
| 游戏 | Home 游戏入口、Party Room、Social Logic |

---

## 9. 目录与 `.gitignore` 约定

**提交到 Git：**

- 全部源代码  
- `deploy-snapshot/`（数据复刻包）  
- `.env.example`、`.env.development`（模板，无生产密钥）  
- `docker-compose*.yml`、`scripts/`  

**不提交（运行时生成）：**

- `.env`、`.env.production`（含密钥）  
- `*.db` / SQLite 本地库  
- `./storage/`、`./apps/api/uploads/`（运行中 bind mount；从 snapshot 恢复）  
- `node_modules/`、`.venv/`、`dist/`  

---

## 10. 故障排查

| 现象 | 处理 |
|------|------|
| API 起不来 | `docker compose logs api`；确认 Postgres healthy |
| 迁移失败 | `docker compose exec api alembic upgrade head` |
| Provider 404 | Admin 检查 API Key；或 `.env` 填 `DASHSCOPE_API_KEY` |
| 语音无教练画像 | 等 API 启动 bootstrap ~5s；或 Admin「立即执行全员日更任务」 |
| 头像 404 | 确认 `./apps/api/uploads` 已从 snapshot 恢复 |
| 复刻后配额异常 | 可选：重新导入 `deploy-snapshot/redis/dump.rdb` |

---

## 11. Agent 快速指令摘要

```text
1. git clone <repo> && cd AinerSpeak
2. cp .env.example .env
3. ./scripts/import-deploy-snapshot.sh
4. 打开 http://localhost:7075 （Web） / http://localhost:7072 （Admin）
5. 登录 demo@ainerspeak.com / Demo123! 或 admin@ainerspeak.com / ChangeMe123!
6. 对照 manifest.json table_counts 与 config/*.json 确认数据已加载
```

**代码 + DEPLOY.md + deploy-snapshot/ = 完整可运行环境。**
