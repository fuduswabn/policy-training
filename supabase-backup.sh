#!/usr/bin/env bash
set -Eeuo pipefail

required() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: ${name}" >&2
    exit 1
  fi
}

required SUPABASE_DB_URL
required BACKUP_S3_BUCKET
required GPG_PASSPHRASE

BACKUP_PREFIX="${BACKUP_PREFIX:-supabase-production}"
BACKUP_DB_RETENTION_DAYS="${BACKUP_DB_RETENTION_DAYS:-35}"
BACKUP_STORAGE_RETENTION_DAYS="${BACKUP_STORAGE_RETENTION_DAYS:-90}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DATE_PATH="$(date -u +%Y/%m/%d)"
WORKDIR="${RUNNER_TEMP:-/tmp}/supabase-backup-${TIMESTAMP}"
DB_DUMP="${WORKDIR}/postgres.dump"
SCHEMA_SQL="${WORKDIR}/schema.sql"
RESTORE_LIST="${WORKDIR}/restore-list.txt"
S3_ARGS=()

if [[ -n "${S3_ENDPOINT_URL:-}" ]]; then
  S3_ARGS+=(--endpoint-url "${S3_ENDPOINT_URL}")
fi

s3_cp() {
  local source="$1"
  local destination="$2"
  shift 2
  aws "${S3_ARGS[@]}" s3 cp "$source" "$destination" --sse AES256 "$@"
}

encrypt_file() {
  local source="$1"
  gpg --batch --yes --pinentry-mode loopback \
    --passphrase "$GPG_PASSPHRASE" \
    --symmetric --cipher-algo AES256 \
    --output "${source}.gpg" "$source"
  sha256sum "${source}.gpg" > "${source}.gpg.sha256"
}

apply_lifecycle_policy() {
  local lifecycle_file="${WORKDIR}/s3-lifecycle.json"
  cat > "$lifecycle_file" <<JSON
{
  "Rules": [
    {
      "ID": "expire-supabase-database-backups",
      "Status": "Enabled",
      "Filter": { "Prefix": "${BACKUP_PREFIX}/db/" },
      "Expiration": { "Days": ${BACKUP_DB_RETENTION_DAYS} }
    },
    {
      "ID": "expire-supabase-storage-backups",
      "Status": "Enabled",
      "Filter": { "Prefix": "${BACKUP_PREFIX}/storage/" },
      "Expiration": { "Days": ${BACKUP_STORAGE_RETENTION_DAYS} }
    }
  ]
}
JSON
  aws "${S3_ARGS[@]}" s3api put-bucket-lifecycle-configuration \
    --bucket "$BACKUP_S3_BUCKET" \
    --lifecycle-configuration "file://${lifecycle_file}"
}

mkdir -p "$WORKDIR"

if [[ "${APPLY_BACKUP_LIFECYCLE:-false}" == "true" ]]; then
  apply_lifecycle_policy
fi

pg_dump --format=custom --no-owner --no-acl --file "$DB_DUMP" "$SUPABASE_DB_URL"
pg_dump --schema-only --no-owner --no-acl --file "$SCHEMA_SQL" "$SUPABASE_DB_URL"

encrypt_file "$DB_DUMP"
encrypt_file "$SCHEMA_SQL"

pg_restore --list "$DB_DUMP" > "$RESTORE_LIST"

if [[ -n "${TEST_RESTORE_DATABASE_URL:-}" ]]; then
  pg_restore --clean --if-exists --no-owner --no-acl --exit-on-error \
    --dbname "$TEST_RESTORE_DATABASE_URL" "$DB_DUMP"
fi

DB_S3_PREFIX="s3://${BACKUP_S3_BUCKET}/${BACKUP_PREFIX}/db/${DATE_PATH}/${TIMESTAMP}"
s3_cp "${DB_DUMP}.gpg" "${DB_S3_PREFIX}/postgres.dump.gpg"
s3_cp "${DB_DUMP}.gpg.sha256" "${DB_S3_PREFIX}/postgres.dump.gpg.sha256" --content-type text/plain
s3_cp "${SCHEMA_SQL}.gpg" "${DB_S3_PREFIX}/schema.sql.gpg"
s3_cp "${SCHEMA_SQL}.gpg.sha256" "${DB_S3_PREFIX}/schema.sql.gpg.sha256" --content-type text/plain
s3_cp "$RESTORE_LIST" "${DB_S3_PREFIX}/restore-list.txt" --content-type text/plain

if [[ "${BACKUP_STORAGE_ENABLED:-true}" == "true" ]]; then
  required SUPABASE_URL
  required SUPABASE_SERVICE_ROLE_KEY

  export BACKUP_STORAGE_DIR="${WORKDIR}/storage"
  node scripts/supabase-storage-backup.mjs

  STORAGE_TAR="${WORKDIR}/storage.tar.gz"
  tar -C "$WORKDIR" -czf "$STORAGE_TAR" storage
  encrypt_file "$STORAGE_TAR"

  STORAGE_S3_PREFIX="s3://${BACKUP_S3_BUCKET}/${BACKUP_PREFIX}/storage/${DATE_PATH}/${TIMESTAMP}"
  s3_cp "${STORAGE_TAR}.gpg" "${STORAGE_S3_PREFIX}/storage.tar.gz.gpg"
  s3_cp "${STORAGE_TAR}.gpg.sha256" "${STORAGE_S3_PREFIX}/storage.tar.gz.gpg.sha256" --content-type text/plain
fi

rm -rf "$WORKDIR"

echo "Supabase backup verified and uploaded to s3://${BACKUP_S3_BUCKET}/${BACKUP_PREFIX}/"
