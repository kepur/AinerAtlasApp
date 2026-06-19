#!/usr/bin/env bash
# Restore deploy-snapshot into a fresh Docker Compose environment.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SNAP="${ROOT}/deploy-snapshot"
PGUSER="${PGUSER:-ainerwise}"
PGDATABASE="${PGDATABASE:-ainerwise}"
PGPASSWORD="${PGPASSWORD:-ainerwise}"

cd "${ROOT}"

if [ ! -f "${SNAP}/database/ainerwise.sql.gz" ]; then
  echo "ERROR: Missing ${SNAP}/database/ainerwise.sql.gz — run scripts/export-deploy-snapshot.sh first"
  exit 1
fi

echo "[1/5] docker compose up (postgres + redis + api dependencies)"
docker compose up -d postgres redis

echo "Waiting for postgres..."
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U "${PGUSER}" -d "${PGDATABASE}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "[2/5] Restore PostgreSQL (drops existing public schema objects via clean restore)"
gunzip -c "${SNAP}/database/ainerwise.sql.gz" | docker compose exec -T -e PGPASSWORD="${PGPASSWORD}" postgres \
  psql -U "${PGUSER}" -d "${PGDATABASE}" -v ON_ERROR_STOP=1 -q

echo "[3/5] Restore bind-mount files"
mkdir -p "${ROOT}/storage" "${ROOT}/apps/api/uploads"
rsync -a "${SNAP}/files/storage/" "${ROOT}/storage/"
rsync -a "${SNAP}/files/uploads/" "${ROOT}/apps/api/uploads/"

echo "[4/5] Restore Redis (optional)"
if [ -f "${SNAP}/redis/dump.rdb" ]; then
  docker compose stop redis
  docker compose cp "${SNAP}/redis/dump.rdb" redis:/data/dump.rdb 2>/dev/null || true
  docker compose start redis
fi

echo "[5/5] Start full stack"
docker compose up -d --build

echo ""
echo "Restore complete. Verify:"
echo "  API:   http://localhost:7070/health"
echo "  Web:   http://localhost:7075"
echo "  Admin: http://localhost:7072"
echo "  Login: admin@ainerspeak.com / ChangeMe123!"
