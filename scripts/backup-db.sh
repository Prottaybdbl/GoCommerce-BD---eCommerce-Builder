#!/usr/bin/env bash
# ==============================================================================
# Go Commerce BD — Automated Database Off-Site Backup Script
# Usage: ./scripts/backup-db.sh
# Cron:  0 2 * * * /app/scripts/backup-db.sh >> /var/log/gocom-backup.log 2>&1
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/tmp/gocom-backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="gocom_db_${TIMESTAMP}.sql.gz"
BACKUP_FILEPATH="${BACKUP_DIR}/${BACKUP_FILENAME}"
CHECKSUM_FILEPATH="${BACKUP_FILEPATH}.sha256"

mkdir -p "${BACKUP_DIR}"

echo "=========================================="
echo "📦 Starting GoCom DB Backup: ${TIMESTAMP}"
echo "=========================================="

# 1. Run pg_dump with gzip compression
echo "⏳ Dumping PostgreSQL database..."
PGPASSWORD="${POSTGRES_PASSWORD:-gocom_local_secret}" pg_dump \
  -h "${POSTGRES_HOST:-localhost}" \
  -p "${POSTGRES_PORT:-5432}" \
  -U "${POSTGRES_USER:-gocom_user}" \
  -d "${POSTGRES_DB:-gocom_db}" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  | gzip -9 > "${BACKUP_FILEPATH}"

BACKUP_SIZE=$(du -h "${BACKUP_FILEPATH}" | cut -f1)
echo "✅ Database dumped successfully (${BACKUP_SIZE})"

# 2. Compute SHA256 Checksum
echo "🔒 Computing SHA256 verification checksum..."
sha256sum "${BACKUP_FILEPATH}" > "${CHECKSUM_FILEPATH}"
CHECKSUM=$(cut -d ' ' -f 1 "${CHECKSUM_FILEPATH}")
echo "Checksum: ${CHECKSUM}"

# 3. Off-site upload to Cloudflare R2 (if configured)
if [ -n "${R2_BACKUP_BUCKET:-}" ] && command -v aws >/dev/null 2>&1; then
  echo "☁️ Uploading to Cloudflare R2 (${R2_BACKUP_BUCKET})..."
  aws s3 cp "${BACKUP_FILEPATH}" "s3://${R2_BACKUP_BUCKET}/db/${BACKUP_FILENAME}" \
    --endpoint-url "${R2_ENDPOINT_URL}"
  aws s3 cp "${CHECKSUM_FILEPATH}" "s3://${R2_BACKUP_BUCKET}/db/${BACKUP_FILENAME}.sha256" \
    --endpoint-url "${R2_ENDPOINT_URL}"
  echo "✅ Off-site upload complete."
else
  echo "ℹ️ Cloudflare R2 bucket not configured; backup preserved locally at ${BACKUP_FILEPATH}"
fi

# 4. Clean up local backups older than 7 days
find "${BACKUP_DIR}" -name "gocom_db_*.sql.gz*" -mtime +7 -delete || true

echo "🎉 Backup completed successfully."
