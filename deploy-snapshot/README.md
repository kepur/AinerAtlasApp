# Deploy Snapshot

本目录是**可复刻环境的完整数据包**，与根目录 `DEPLOY.md` 配合使用。

| 路径 | 内容 |
|------|------|
| `manifest.json` | 导出时间、Git 版本、端口、表行数 |
| `database/ainerwise.sql.gz` | PostgreSQL 全量（含 Admin 配置、用户、对话、游戏、语音教练画像、加密 API Key） |
| `files/storage/` | TTS 缓存等对象存储（bind mount → `./storage`） |
| `files/uploads/` | 用户头像等（bind mount → `./apps/api/uploads`） |
| `redis/dump.rdb` | 配额/限流计数（可选） |
| `config/*.json` | Admin 可读配置摘要（无 API Key 明文） |

**更新快照**：`./scripts/export-deploy-snapshot.sh`  
**导入快照**：`./scripts/import-deploy-snapshot.sh`

详见 [DEPLOY.md](../DEPLOY.md)。
