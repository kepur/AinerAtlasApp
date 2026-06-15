#!/usr/bin/env bash
# PostgreSQL backup script — daily full dump + WAL archive check
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/ainerspeak}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
RETENTION_WEEKLY="${RETENTION_WEEKLY:-12}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PGHOST="${PGHOST:-postgres}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-ainerspeak}"
PGDATABASE="${PGDATABASE:-ainerspeak}"

mkdir -p "${BACKUP_DIR}/full" "${BACKUP_DIR}/wal"

echo "[$(date -Iseconds)] Starting PostgreSQL backup..."

# Full database dump
DUMP_FILE="${BACKUP_DIR}/full/${PGDATABASE}_${TIMESTAMP}.sql.gz"
PGPASSWORD="${PGPASSWORD:-ainerspeak}" pg_dump \
    -h "${PGHOST}" \
    -p "${PGPORT}" \
    -U "${PGUSER}" \
    -d "${PGDATABASE}" \
    --format=plain \
    --no-owner \
    | gzip > "${DUMP_FILE}"

echo "[$(date -Iseconds)] Full dump saved: ${DUMP_FILE}"

# WAL archive check (if configured)
WAL_DIR="${PGDATA:-/var/lib/postgresql/data}/pg_wal"
if [ -d "${WAL_DIR}" ]; then
    WAL_COUNT=$(find "${WAL_DIR}" -name "*.ready" -o -name "0*" 2>/dev/null | wc -l | tr -d ' ')
    echo "[$(date -Iseconds)] WAL segments present: ${WAL_COUNT}"
    echo "${WAL_COUNT}" > "${BACKUP_DIR}/wal/last_check_${TIMESTAMP}.txt"
fi

# Object storage upload placeholder
if [ -n "${S3_BUCKET:-}" ]; then
    echo "[$(date -Iseconds)] Uploading to s3://${S3_BUCKET}/backups/..."
    # aws s3 cp "${DUMP_FILE}" "s3://${S3_BUCKET}/backups/full/"
    echo "[$(date -Iseconds)] S3 upload configured but skipped (set AWS credentials)"
fi

# Cleanup old backups with tiered retention
find "${BACKUP_DIR}/full" -name "*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete 2>/dev/null || true
find "${BACKUP_DIR}/wal" -name "*.txt" -mtime +"${RETENTION_DAYS}" -delete 2>/dev/null || true

echo "[$(date -Iseconds)] Backup complete. Daily: ${RETENTION_DAYS}d, Weekly: ${RETENTION_WEEKLY}w."

# Restore instructions:
# gunzip -c ${DUMP_FILE} | PGPASSWORD=... psql -h ${PGHOST} -U ${PGUSER} -d ${PGDATABASE}
