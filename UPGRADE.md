# AinerSpeak 已上线环境滚动升级指南

本文只用于**已经部署并正在运行的线上环境**。全新服务器请看
[LOCAL_DEPLOYMENT.md](./LOCAL_DEPLOYMENT.md) 或 [DEPLOY.md](./DEPLOY.md)。

## 先看结论

### 全局多语言模块化课程补丁（2026-09-20）

此补丁复用现有 `language_course_progress.state` JSON 和
`language_practice_attempts`，**没有新增 Alembic revision，不需要额外 SQL**。
若线上已经在 `m8n9o0p1q2r3`，只需沿用本文备份、构建、先替换 API 再替换 Web
的步骤；更老的版本仍须先执行下述 `alembic upgrade head`。

旧生存冲刺记录保留；新课程用独立的 `curriculum_v1` 状态保存，旧课“看过”不会
被自动当作新课“考核通过”。首次进入新版从第一个未完成的新课开始，这是课程
版本分离，不是清空旧记录。不要执行降级迁移或导入本地数据库。

新 API 兼容原有页面路由，适合先部署后端再部署前端；单实例 Compose 仍不是
真正零停机。结构、课程包扩展和验收边界见
[多语言课程架构](./docs/MULTILINGUAL_LEARNING.md)。

### 上一版 Edge TTS 与持久化进度的基础迁移

| 问题 | 本次答案 |
|---|---|
| 是否需要数据库升级 | **需要** |
| 是否要手写 SQL | **不需要，也不要手工改表** |
| 正确命令 | `alembic upgrade head` |
| 本次迁移终点 | `m8n9o0p1q2r3 (head)` |
| 是否要清空或重建数据库 | **绝对不要** |
| 是否要导入 `deploy-snapshot` | **不要**，那是新环境复刻包 |
| 是否保留现有用户、配置与 Provider Key | 保留；它们仍在原 Postgres 和 `.env` 中 |
| 当前 Compose 能否真正零停机 | 单实例不能；按服务替换时 API 约有数秒窗口 |

本次数据库变更是向前兼容的增量迁移：

1. `l7m8n9o0p1q2`
   - 补充服务器端 Edge TTS 配置字段；
   - 将旧的 `browser` TTS 默认值切换为 `edge`；
   - 不删除用户数据。
2. `m8n9o0p1q2r3`
   - 新建 `language_course_progress`；
   - 新建 `language_practice_attempts`；
   - 建立用户、课程、语言和日期索引；
   - 旧用户首次打开课程时才创建进度，不需要离线回填。

> API 启动命令虽然也包含 `alembic upgrade head`，但线上建议在替换 API
> 之前显式执行迁移。这样迁移失败时旧 API 仍在运行，更容易停止和处理。

---

## 1. 约定和禁止事项

以下命令都在服务器的 AinerSpeak 仓库根目录执行，并沿用当前生产方式：

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ...
```

为减少重复，可在当前 Shell 定义：

```bash
dc() { docker compose -f docker-compose.yml -f docker-compose.prod.yml "$@"; }
```

升级期间不要执行：

```bash
docker compose down -v        # 会删除 Postgres/Redis volume
docker volume prune           # 可能删除业务数据
./scripts/import-deploy-snapshot.sh  # 会把线上数据替换成快照
alembic downgrade -1          # 本次会删除新课程记录表
```

不要覆盖服务器已有的 `.env`，也不要把本地 SQLite、`.env.production` 示例或
开发机的数据库复制到线上。

---

## 2. 升级前检查

```bash
cd /path/to/AinerSpeak

dc ps
curl --fail --silent --show-error http://127.0.0.1:7070/health
git status --short

OLD_SHA=$(git rev-parse HEAD)
echo "old release: ${OLD_SHA}"
```

要求：

- `api`、`postgres`、`redis`、`web`、`admin` 正常运行；
- `/health` 返回 `{"status":"ok","service":"ainerspeak-api"}`；
- Git 工作区应为空。若服务器有临时源码修改，先记录并处理，不要直接覆盖；
- `.env` 必须是服务器原有生产配置，且未被 Git 跟踪。

检查数据库当前迁移：

```bash
dc exec -T api alembic current
dc exec -T api alembic heads
```

`current` 可以落后于 `heads`，但不能显示未知 revision 或多分支 head。

---

## 3. 先备份，再拉代码

### 3.1 备份 Postgres

当前 Compose 默认数据库为 `ainerwise`：

```bash
BACKUP_TAG=$(date +%Y%m%d_%H%M%S)
mkdir -p "backups/${BACKUP_TAG}"

dc exec -T postgres \
  pg_dump -U ainerwise -d ainerwise --format=custom \
  > "backups/${BACKUP_TAG}/ainerwise.dump"

test -s "backups/${BACKUP_TAG}/ainerwise.dump"
pg_restore --list "backups/${BACKUP_TAG}/ainerwise.dump" >/dev/null
```

若线上使用外部 PostgreSQL，请使用线上真实的 host/user/database 执行 `pg_dump`，
不要照抄 `ainerwise`。

### 3.2 备份持久化文件和当前版本

```bash
mkdir -p storage apps/api/uploads
tar -czf "backups/${BACKUP_TAG}/files.tar.gz" storage apps/api/uploads
git rev-parse HEAD > "backups/${BACKUP_TAG}/git-sha.txt"
```

语音缓存位于 `storage/tts_cache`；丢失后可以重新生成，但备份它能避免重新调用
Edge TTS。

### 3.3 拉取发布版本

```bash
git fetch origin
git switch master
git pull --ff-only origin master
NEW_SHA=$(git rev-parse HEAD)

echo "upgrade ${OLD_SHA} -> ${NEW_SHA}"
git log --oneline --decorate "${OLD_SHA}..${NEW_SHA}"
```

如果 `git pull --ff-only` 失败，停止升级。不要在生产服务器强制 reset。

---

## 4. 先构建新镜像，不停止旧服务

```bash
dc build --pull api web admin
```

构建成功后检查生产 Compose 合并结果：

```bash
dc config --quiet
```

生产配置应该满足：

- API 仅挂载 `./storage` 和 `./apps/api/uploads`；
- API 的 `APP_ENV=production`、`DEBUG=false`；
- Web 只映射 `7075:80`；
- Web 不挂载源码；
- TTS 缓存为 `/app/storage/tts_cache`。

此阶段旧容器仍然提供服务。

---

## 5. 使用新 API 镜像执行数据库迁移

不要使用旧 API 容器里的 migration 文件。构建完成后用一次性的新镜像执行：

```bash
dc run --rm --no-deps api alembic current
dc run --rm --no-deps api alembic upgrade head
dc run --rm --no-deps api alembic current
```

最后一条应显示：

```text
m8n9o0p1q2r3 (head)
```

迁移后旧 API 可以继续短暂运行，因为本次只增加字段和表，没有删除旧字段。

如果迁移失败：

1. 不要替换 API 容器；
2. 保存完整错误：`dc logs --tail=200 api`；
3. 保留数据库备份；
4. 修正 migration 后继续向前执行，优先不要 downgrade。

---

## 6. 按服务替换容器

先升级 API：

```bash
dc up -d --no-deps --force-recreate api

for i in $(seq 1 30); do
  if curl --fail --silent http://127.0.0.1:7070/health >/dev/null; then
    echo "API healthy"
    break
  fi
  sleep 2
done

curl --fail --silent --show-error http://127.0.0.1:7070/health
dc logs --tail=100 api
```

API 健康后再替换静态前端：

```bash
dc up -d --no-deps --force-recreate web admin
dc ps

curl --fail --silent --show-error http://127.0.0.1:7075/health
curl --fail --silent --show-error http://127.0.0.1:7072/ >/dev/null
```

最后清理这次升级不再使用的旧镜像（可选，确认稳定后再做）：

```bash
docker image prune -f
```

不要使用带 `--volumes` 的清理命令。

---

## 7. 本次版本专项验收

### 7.1 数据库

```bash
dc run --rm --no-deps api alembic current
```

必须为 `m8n9o0p1q2r3 (head)`。

### 7.2 页面和学习状态

1. 登录 Web；
2. 打开 `/survival-sprint`；
3. 切换西班牙语、法语或其他语言；
4. 推进一个课程步骤；
5. 刷新页面，确认仍停留在原步骤；
6. 在场景中标记一次错误，确认“今日练习”和“待回炉”增加；
7. 进入词汇练习，确认只显示当前语言的复习项。

### 7.3 Edge TTS 持久化缓存

先在页面播放一句固定课程语音，然后执行：

```bash
find storage/tts_cache -type f -name '*.mp3' -size +0 | head
```

再检查 Web 反向代理：

```bash
AUDIO_FILE=$(find storage/tts_cache -type f -name '*.mp3' -size +0 | head -1)
AUDIO_NAME=$(basename "${AUDIO_FILE}")
curl --fail --head "http://127.0.0.1:7075/audio/tts/${AUDIO_NAME}"
```

期望为 `200` 且 `Content-Type: audio/mpeg`。第二次播放同一句时不应再次请求
Edge TTS 生成。

### 7.4 后台语音开关

在 Admin 检查：

- 默认 TTS Provider 为 Edge；
- 实时对话总开关保持原线上设定；
- 所有 LLM 语音能力不可用时，Coach 实时入口不显示。

---

## 8. 回滚方案

### 8.1 首选：只回滚应用镜像，保留增量数据库结构

本次 migration 是增量结构，优先保留数据库并回到旧代码：

```bash
git switch --detach "${OLD_SHA}"
dc build api web admin
dc up -d --no-deps --force-recreate api web admin
curl --fail --silent --show-error http://127.0.0.1:7070/health
```

旧代码不会使用新增课程表。注意：`l7m8n9o0p1q2` 已把默认 TTS 改为 `edge`；
若旧版本不认识 Edge Provider，语音功能可能暂时不可用，应优先修复并重新向前发布。

恢复继续跟踪主分支：

```bash
git switch master
```

### 8.2 数据库也必须回滚

不要直接执行 `alembic downgrade -1`：它会删除课程进度表及已经产生的新学习记录。

只有在明确接受升级后数据丢失、已停写并有维护窗口时，才恢复第 3 步的完整
Postgres dump。恢复属于破坏性操作，应由负责人现场确认后执行。

---

## 9. 关于“真正零停机”

当前仓库的 Docker Compose 每个服务只有一个实例，所以这里的“滚动升级”指：

- 数据库先做向前兼容迁移；
- API、Web、Admin 分开替换；
- 数据库、Redis 和文件目录始终不停止；
- 把不可用窗口压缩到单个容器切换的数秒。

若要求严格零停机，需要额外部署蓝绿或多副本架构：至少两个 API 实例、共享
Postgres/Redis/storage、外部负载均衡健康检查，以及 Web 静态版本原子切换。
在该架构完成前，不要把单实例 Compose 宣称为零停机。
