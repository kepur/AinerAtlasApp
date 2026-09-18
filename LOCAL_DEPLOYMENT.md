# AinerSpeak 本地默认部署 README

本文描述仓库当前默认的本地部署方式。线上已有环境升级请使用
[UPGRADE.md](./UPGRADE.md)，不要把本地初始化命令直接用于线上。

## 1. 推荐方案：Docker Compose 开发栈

### 前置条件

- Docker Desktop / Docker Engine；
- Docker Compose v2（支持 `docker compose`）；
- Git。

### 第一次启动

```bash
git clone <repository-url> AinerSpeak
cd AinerSpeak

# 仅第一次创建本地配置；已有 .env 时不要覆盖
test -f .env || cp .env.example .env

docker compose up -d --build
docker compose ps
```

API 容器会自动执行 `alembic upgrade head`，随后启动 FastAPI。不需要手工导入
SQL，也不需要导入 `deploy-snapshot`。

### 默认访问地址

| 服务 | 地址 | 说明 |
|---|---|---|
| Web H5 | `https://localhost:7075` | Vite 自签名 HTTPS，首次需信任本地证书 |
| API | `http://localhost:7070` | 健康检查 `/health` |
| Admin | `http://localhost:7072` | Nginx 静态管理端 |
| PostgreSQL | `localhost:7073` | 容器内端口 5432 |
| Redis | `localhost:7074` | 容器内端口 6379 |
| Admin Vite 裸跑 | `http://localhost:7076` | 仅手工开发 Admin 时使用 |

验证：

```bash
curl --fail http://localhost:7070/health
docker compose ps
```

### 默认账号

| 用途 | 邮箱 | 默认密码 |
|---|---|---|
| Web Demo | `demo@ainerspeak.com` | `Demo123!` |
| Admin | `admin@ainerspeak.com` | `ChangeMe123!` |

这些账号只用于本地开发。公网部署必须更换密码、JWT Secret 和 Encryption Key。

---

## 2. 默认容器和持久化

| 服务 | 本地模式 | 数据位置 |
|---|---|---|
| `api` | 源码挂载、Uvicorn `--reload` | 数据在 Postgres；上传目录单独挂载 |
| `web` | Vite HMR | 源码挂载，`node_modules` 独立 volume |
| `admin` | 构建后的 Nginx | 修改 Admin 后需要 rebuild |
| `postgres` | PostgreSQL 16 | Docker volume `postgres_data` |
| `redis` | Redis 7 | Docker volume `redis_data` |
| Edge TTS | API 静态文件服务 | `./storage/tts_cache` |
| 上传文件 | API 静态文件服务 | `./apps/api/uploads` |

停止容器不会删除数据：

```bash
docker compose stop
docker compose start
```

普通关闭：

```bash
docker compose down
```

不要随意执行 `docker compose down -v`，它会删除本地 Postgres/Redis volume。

---

## 3. 日常开发命令

查看状态与日志：

```bash
docker compose ps
docker compose logs -f api
docker compose logs -f web
docker compose logs --tail=100 admin
```

执行数据库迁移：

```bash
docker compose exec api alembic current
docker compose exec api alembic upgrade head
```

本地开发栈挂载了 API 的 `app/` 和 `alembic/`，所以 Python 源码会自动 reload；
Web 由 Vite HMR 更新。

以下变更需要重建镜像：

- `apps/api/pyproject.toml` 中的 Python 依赖；
- Web/Admin 的 `package.json`；
- 任一 Dockerfile；
- Admin 前端代码（默认 Admin 容器不是 Vite HMR）。

```bash
docker compose build api web admin
docker compose up -d --force-recreate api web admin
```

仅重建 Admin：

```bash
docker compose up -d --build --no-deps admin
```

---

## 4. Edge TTS 本地缓存

固定课程语音首次生成后不重复调用 Provider：

- Docker 本地部署：`./storage/tts_cache/*.mp3`；
- API 裸跑：`./apps/web/public/audio/tts/*.mp3`；
- 浏览器 URL：`/audio/tts/<hash>.mp3`；
- Web Vite 和生产 Nginx 都会把 `/audio` 正确转发或提供给浏览器。

检查：

```bash
find storage/tts_cache -type f -name '*.mp3' -size +0 | head
```

缓存可以删除后重新生成，但线上升级建议保留，以免产生不必要的网络请求。

---

## 5. 本地模拟生产部署

生产模式使用静态 Web、无源码挂载的 API，并从服务器 `.env` 读取秘密。

先确保 `.env` 是你准备好的本地生产模拟配置。不要直接把模板中的
`CHANGE_ME` 用于真实公网：

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

生产 overlay 会确保：

- `APP_ENV=production`、`DEBUG=false`；
- API 代码来自镜像，不挂载本地源码；
- Web 只暴露 `7075:80`；
- 只保留 `storage` 和 `uploads` 两个文件持久化目录；
- API 启动前自动执行 `alembic upgrade head`。

停止本地生产模拟：

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
```

---

## 6. 不使用 Docker 的裸机开发

### API

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# 默认可使用 apps/api 下的 SQLite 开发库
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 7070
```

### Web

另开终端：

```bash
cd apps/web
npm install
VITE_API_PROXY=http://127.0.0.1:7070 npm run dev
```

访问 `https://localhost:7075`。

### Admin Vite

另开终端：

```bash
cd apps/admin
npm install
VITE_API_PROXY=http://127.0.0.1:7070 npm run dev
```

访问 `http://localhost:7076`。

若 API 配置了 Redis，请保证对应 Redis 可用；也可以只用 Compose 启动依赖：

```bash
docker compose up -d postgres redis
```

此时裸跑 API 的 `DATABASE_URL`、`REDIS_URL` 要指向宿主机映射端口，而不是
Compose 网络里的 `postgres:5432` 和 `redis:6379`。

---

## 7. 本地升级已有开发数据库

拉取新代码后：

```bash
git pull --ff-only
docker compose build api web admin
docker compose exec api alembic upgrade head
docker compose up -d --force-recreate api web admin
```

本次多语言课程版本必须达到：

```text
m8n9o0p1q2r3 (head)
```

不要删除原 `postgres_data` 后重建，否则会丢失本地用户、Admin 配置和学习记录。

---

## 8. 常见问题

| 现象 | 处理 |
|---|---|
| API 启动失败 | `docker compose logs --tail=200 api` |
| 提示缺表 | `docker compose exec api alembic upgrade head` |
| 707x 端口被占用 | 修改 Compose 左侧宿主机端口，并同步更新 CORS |
| Web 能开但 API 请求失败 | 检查 API health、Web proxy 和 CORS |
| `/audio/tts/*.mp3` 返回 HTML | 确认新 Nginx 配置已构建，并检查 `/audio/` 代理 |
| 修改 Web 后不更新 | 检查 Vite 容器；生产模拟需重新 build Web |
| 修改 Admin 后不更新 | `docker compose up -d --build --no-deps admin` |
| 不确定能否删 volume | 不要删；先做 `pg_dump` |

线上升级、备份和回滚的完整顺序见 [UPGRADE.md](./UPGRADE.md)。
