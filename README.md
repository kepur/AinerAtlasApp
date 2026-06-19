# AinerSpeak

AinerSpeak is an AI Expression OS: a personal thinking, multilingual expression, grammar mastery, vocabulary mastery, and voice practice platform.

This repository is intentionally API-first. The same backend contracts can support the H5/PWA app, PC studio, admin console, and future native apps.

**完整部署与环境复刻**（含数据库、Admin 配置、文件快照、**Agent 部署提示词**）见根目录 **[DEPLOY.md](./DEPLOY.md)**、**[AGENT_DEPLOY_PROMPT.md](./AGENT_DEPLOY_PROMPT.md)** 与 **`deploy-snapshot/`** 数据包。

## Apps

- `apps/api`: FastAPI backend for auth, onboarding, conversations, assets, grammar queues, voice hooks, provider routing, and admin operations.
- `apps/web`: Mobile-first H5/PWA user app.
- `apps/admin`: Admin console for users, memberships, providers, prompts, logs, and quotas.
- `docs`: Architecture and product implementation notes derived from the root design documents.

## Local Development

```bash
# 1. Copy environment config
cp .env.example .env
# Or use the development template:
cp .env.development .env

# 2. API
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Database migration (recommended)
alembic upgrade head

# Start server
uvicorn app.main:app --reload --port 7070

# 3. Web app
cd apps/web
npm install
npm run dev

# 4. Admin app
cd apps/admin
npm install
npm run dev
```

## Docker Compose Ports

| Service | URL / Host |
|---------|------------|
| API | http://localhost:7070 |
| H5 (Web) | http://localhost:7075 |
| Admin | http://localhost:7072 |
| Postgres | localhost:7073 |
| Redis | localhost:7074 |
| Admin Vite dev | http://localhost:7076 |

**开发模式（默认）**：`docker compose up -d` 会挂载本地源码——API 自动 `--reload`，Web 跑 Vite HMR（7075），改代码后刷新即可，无需 rebuild。

**生产静态打包**：`npm run docker:prod`

**强制全量重建镜像**：`npm run docker:rebuild`

```bash
docker compose up -d
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_ENV` | `development` | Environment name (`development` / `production`) |
| `DEBUG` | `false` | Enable debug mode (verbose logs, colored output) |
| `DATABASE_URL` | `sqlite:///./ainerspeak.db` | Database connection string |
| `REDIS_URL` | `redis://localhost:7074/0` | Redis URL (optional in dev) |
| `JWT_SECRET` | `change-me-in-production` | JWT signing secret — **must change in production** |
| `CORS_ORIGINS` | `http://localhost:7075,...` | Comma-separated allowed origins |
| `ENCRYPTION_KEY` | (auto-generated) | Fernet key for API key encryption. Generate with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `DEFAULT_LLM_PROVIDER` | `mock` | Default LLM provider name |
| `DEFAULT_VOICE_PROVIDER` | `mock` | Default voice provider name |

See `.env.example` for the full list. For production, refer to `.env.production`.

## Database Migrations

```bash
cd apps/api

# Generate a new migration after model changes
alembic revision --autogenerate -m "describe your changes"

# Apply all pending migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

## Initial Scope

The current implementation focuses on the v1.1 FULL MVP:

- Email/password auth with JWT-ready structure.
- Onboarding profile and AI memory fields.
- Text thought conversations with bilingual expression output.
- Expression asset creation and Thought Freeze support.
- Grammar, pattern, and vocabulary review queues.
- Provider abstraction for LLM and voice services.
- Admin APIs and console skeleton for manual membership and provider management.

External AI providers are represented behind adapters. The default adapter is deterministic and local so the project can run before API keys are configured.

## Default Accounts

| Role | Email | Password | URL |
|------|-------|----------|-----|
| Admin | `admin@ainerspeak.com` | `ChangeMe123!` | http://localhost:7072 (Docker) / http://localhost:7076 (Vite dev) |
| Demo (H5) | `demo@ainerspeak.com` | `Demo123!` | http://localhost:7075/login |

## Demo Mode (H5)

- When **Demo 演示阶段** is enabled in Admin → **Security**, the H5 login page pre-fills the demo account and shows a one-click **演示登录** button.
- When disabled, users must **register** and **login** manually; the register link appears on the login page.
- Demo account email/password can be customized in the same admin panel (password defaults to `Demo123!` from env).

## Registration & Email Verification

- Users register with **email + verification code + password** on the H5 app.
- **Google 邮箱** (`@gmail.com`, `googlemail.com`) get a **30-day VIP trial** by default; after expiry the account is automatically disabled until an admin upgrades membership.
- **Other emails** register as Free users.
- **SMTP** is configured in Admin → **Security** → **Auth & SMTP** (host, port, username, password, from address).
- If SMTP is not configured in development, the API returns `dev_code` in the send-code response and logs the code to the server console.
- Admins can toggle **email verification**, **Google trial days/level**, and **Google domains** from the same panel.

## Localization & Theme

- **Admin → Security → 界面语言与主题**：勾选 H5 支持的界面语言（中/英/日/韩/西/法），设置默认语言与默认深/浅色主题。
- **H5 → 我的 → 界面偏好**：用户可切换界面语言与主题（若后台允许）；语言会同步到 `ui_language` / `explanation_language`，LLM 解释与追问会使用所选语言。
- Public config: `GET /api/config/app`（H5 启动时拉取可用语言列表）
