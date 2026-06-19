#!/usr/bin/env bash
# Export full deploy snapshot to ./deploy-snapshot/ (code repo root).
# Run while Docker Compose stack is up. Safe to re-run; overwrites snapshot files.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SNAP="${ROOT}/deploy-snapshot"
PGUSER="${PGUSER:-ainerwise}"
PGDATABASE="${PGDATABASE:-ainerwise}"

cd "${ROOT}"

if ! docker compose ps postgres --status running >/dev/null 2>&1; then
  echo "ERROR: postgres container not running. Start with: docker compose up -d"
  exit 1
fi

mkdir -p "${SNAP}/database" "${SNAP}/files/storage" "${SNAP}/files/uploads" "${SNAP}/config" "${SNAP}/redis"

echo "[1/6] PostgreSQL dump → deploy-snapshot/database/ainerwise.sql.gz"
docker compose exec -T postgres pg_dump -U "${PGUSER}" -d "${PGDATABASE}" --no-owner --format=plain \
  | gzip -9 > "${SNAP}/database/ainerwise.sql.gz"

echo "[2/6] Bind-mount files → deploy-snapshot/files/"
rsync -a --delete "${ROOT}/storage/" "${SNAP}/files/storage/"
rsync -a --delete "${ROOT}/apps/api/uploads/" "${SNAP}/files/uploads/"

echo "[3/6] Redis RDB → deploy-snapshot/redis/dump.rdb"
docker compose exec -T redis redis-cli SAVE >/dev/null
docker compose cp redis:/data/dump.rdb "${SNAP}/redis/dump.rdb" 2>/dev/null || true

echo "[4/6] Admin config JSON (human/agent readable, no API key plaintext)"
docker compose exec -T postgres psql -U "${PGUSER}" -d "${PGDATABASE}" -t -A -c \
  "SELECT row_to_json(t) FROM (SELECT id, default_llm_provider, default_voice_provider, default_embedding_provider, enabled_locales, voice_platform_config, llm_routing FROM app_settings LIMIT 1) t;" \
  > "${SNAP}/config/app_settings.json"
docker compose exec -T postgres psql -U "${PGUSER}" -d "${PGDATABASE}" -t -A -c \
  "SELECT coalesce(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT level, display_name, daily_ai_dialogue, daily_voice_minutes, enabled FROM membership_plans ORDER BY level) t;" \
  > "${SNAP}/config/membership_plans.json"
docker compose exec -T postgres psql -U "${PGUSER}" -d "${PGDATABASE}" -t -A -c \
  "SELECT coalesce(json_agg(row_to_json(t)), '[]'::json) FROM (SELECT provider_name, provider_type, enabled, api_base_url, model_name, priority FROM ai_providers ORDER BY provider_name) t;" \
  > "${SNAP}/config/ai_providers.json"
docker compose exec -T postgres psql -U "${PGUSER}" -d "${PGDATABASE}" -t -A -c \
  "SELECT row_to_json(t) FROM (SELECT demo_mode_enabled, demo_user_email, email_verification_enabled FROM auth_settings LIMIT 1) t;" \
  > "${SNAP}/config/auth_settings.json"

echo "[5/6] manifest.json"
COMMIT="$(git -C "${ROOT}" rev-parse HEAD 2>/dev/null || echo unknown)"
BRANCH="$(git -C "${ROOT}" branch --show-current 2>/dev/null || echo unknown)"
EXPORTED="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
COUNTS="$(docker compose exec -T postgres psql -U "${PGUSER}" -d "${PGDATABASE}" -t -A -c \
  "SELECT json_build_object('users', (SELECT count(*) FROM users), 'conversations', (SELECT count(*) FROM conversations), 'ai_providers', (SELECT count(*) FROM ai_providers), 'membership_plans', (SELECT count(*) FROM membership_plans), 'game_templates', (SELECT count(*) FROM game_templates), 'voice_sessions', (SELECT count(*) FROM voice_sessions), 'user_voice_coach_profiles', (SELECT count(*) FROM user_voice_coach_profiles));")"

export SNAP COMMIT BRANCH EXPORTED COUNTS
python3 - <<'PY'
import json, os
snap = os.environ["SNAP"]
counts = json.loads(os.environ["COUNTS"])
manifest = {
    "schema_version": 1,
    "exported_at": os.environ["EXPORTED"],
    "git_commit": os.environ["COMMIT"],
    "git_branch": os.environ["BRANCH"],
    "stack": {"api_port": 7070, "web_port": 7075, "admin_port": 7072, "postgres_port": 7073, "redis_port": 7074},
    "database": {
        "engine": "postgresql",
        "name": "ainerwise",
        "user": "ainerwise",
        "dump_file": "database/ainerwise.sql.gz",
    },
    "persistent_bind_mounts": {
        "storage": "files/storage → ./storage",
        "uploads": "files/uploads → ./apps/api/uploads",
    },
    "redis": {"dump_file": "redis/dump.rdb", "note": "Quotas; optional"},
    "table_counts": counts,
    "default_accounts": {
        "admin": {"email": "admin@ainerspeak.com", "password": "ChangeMe123!"},
        "demo": {"email": "demo@ainerspeak.com", "password": "Demo123!", "membership": "vip"},
    },
}
with open(os.path.join(snap, "manifest.json"), "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)
    f.write("\n")
PY

echo "[6/6] Done. Snapshot at ${SNAP}/"
du -sh "${SNAP}"/* 2>/dev/null | sed 's/^/  /'
