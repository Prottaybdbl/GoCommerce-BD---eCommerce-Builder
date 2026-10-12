#!/usr/bin/env bash
# ==============================================================================
# Go Commerce BD — Verified Database Restore Drill Script
# Usage: ./scripts/restore-db.sh /path/to/gocom_db_YYYYMMDD.sql.gz [target_db]
# ==============================================================================

set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "❌ Error: Backup file path required."
  echo "Usage: $0 <backup_file.sql.gz> [target_database]"
  exit 1
fi

BACKUP_FILE="$1"
TARGET_DB="${2:-${POSTGRES_DB:-gocom_restore_drill}}"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

echo "=========================================="
echo "🔄 Starting GoCom DB Restore Drill"
echo "Backup File: ${BACKUP_FILE}"
echo "Target DB:   ${TARGET_DB}"
echo "=========================================="

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ Error: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

# 1. Verify Checksum
if [ -f "${CHECKSUM_FILE}" ]; then
  echo "🔍 Verifying SHA256 integrity..."
  sha256sum -c "${CHECKSUM_FILE}"
  echo "✅ Checksum verified."
else
  echo "⚠️ Warning: No checksum file found. Proceeding with restore..."
fi

# 2. Prepare Target Database
echo "⏳ Creating/Preparing target database '${TARGET_DB}'..."
PGPASSWORD="${POSTGRES_PASSWORD:-gocom_local_secret}" psql \
  -h "${POSTGRES_HOST:-localhost}" \
  -p "${POSTGRES_PORT:-5432}" \
  -U "${POSTGRES_USER:-gocom_user}" \
  -d postgres \
  -c "DROP DATABASE IF EXISTS \"${TARGET_DB}\";" \
  -c "CREATE DATABASE \"${TARGET_DB}\";"

# 3. Restore Data
echo "⏳ Restoring dump into '${TARGET_DB}'..."
gunzip -c "${BACKUP_FILE}" | PGPASSWORD="${POSTGRES_PASSWORD:-gocom_local_secret}" psql \
  -h "${POSTGRES_HOST:-localhost}" \
  -p "${POSTGRES_PORT:-5432}" \
  -U "${POSTGRES_USER:-gocom_user}" \
  -d "${TARGET_DB}" \
  --quiet

# 4. Automated Smoke Verification Drill
echo "🧪 Running Smoke Verification Drill on restored database..."
STORE_COUNT=$(PGPASSWORD="${POSTGRES_PASSWORD:-gocom_local_secret}" psql -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-gocom_user}" -d "${TARGET_DB}" -t -A -c "SELECT COUNT(*) FROM stores;")
PRODUCT_COUNT=$(PGPASSWORD="${POSTGRES_PASSWORD:-gocom_local_secret}" psql -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-gocom_user}" -d "${TARGET_DB}" -t -A -c "SELECT COUNT(*) FROM products;")
ORDER_COUNT=$(PGPASSWORD="${POSTGRES_PASSWORD:-gocom_local_secret}" psql -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-gocom_user}" -d "${TARGET_DB}" -t -A -c "SELECT COUNT(*) FROM orders;")

echo "------------------------------------------"
echo "📊 Restored Verification Metrics:"
echo "   Stores:   ${STORE_COUNT}"
echo "   Products: ${PRODUCT_COUNT}"
echo "   Orders:   ${ORDER_COUNT}"
echo "------------------------------------------"

if [ "${STORE_COUNT}" -gt 0 ]; then
  echo "✅ Restore Drill PASSED! Database restored and verified successfully."
else
  echo "❌ Restore Drill FAILED: Store count is 0."
  exit 1
fi
