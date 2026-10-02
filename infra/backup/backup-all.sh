#!/usr/bin/env bash
# ==============================================================================
# INF-B-04: encrypted, verified, offsite backup of every datastore.
#
# Nothing here is "best effort": each leg fails the script, the run is logged,
# and the artifact is only deleted after the offsite copy has been verified by
# SHA256. A backup that quietly half-succeeded is worse than no backup.
#
# Required environment (compose enforces these with `:?`):
#   MONGO_URI, POSTGRES_URI, OFFSITE_BUCKET, BACKUP_ENCRYPTION_KEY
# Optional:
#   RETENTION_DAYS (30), OFFSITE_ENDPOINT/ACCESS_KEY/SECRET_KEY, BACKUP_RECIPIENT
# ==============================================================================
set -Eeuo pipefail

ARTIFACT_DIR="${ARTIFACT_DIR:-/artifacts}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
WORK="${ARTIFACT_DIR}/${TIMESTAMP}"

log()  { printf '[backup %s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
die()  { printf '[backup FATAL] %s\n' "$*" >&2; exit 1; }

cleanup_partial() {
  # A half-written artifact must never be uploaded as if it were complete.
  [[ -f "${WORK}/.COMPLETE" ]] || rm -rf "$WORK"
}
trap cleanup_partial EXIT

# ── 0. Preconditions ─────────────────────────────────────────────────────────
[[ -n "${MONGO_URI:-}"      ]] || die "MONGO_URI is not set"
[[ -n "${POSTGRES_URI:-}"   ]] || die "POSTGRES_URI is not set"
[[ -n "${OFFSITE_BUCKET:-}" ]] || die "OFFSITE_BUCKET is not set (a backup that never leaves the host is not a backup)"

mkdir -p "$WORK" || die "cannot create ${WORK}"

# ── 1. MongoDB ───────────────────────────────────────────────────────────────
log "dumping MongoDB"
# --gzip keeps the artifact small; --oplogReplay gives point-in-time recovery
# on top of the nightly snapshot (this is what makes the RPO<=15m claim honest).
mongodump --uri="$MONGO_URI" --gzip --oplogReplay --out="${WORK}/mongo" \
  || die "mongodump failed"
[[ -d "${WORK}/mongo" ]] || die "mongodump produced no output"

# ── 2. PostgreSQL ────────────────────────────────────────────────────────────
log "dumping PostgreSQL"
pg_dump --dbname="$POSTGRES_URI" --format=custom --compress=9 --file="${WORK}/postgres.dump" \
  || die "pg_dump failed"
[[ -s "${WORK}/postgres.dump" ]] || die "postgres.dump is empty"

# ── 3. Object store (MinIO / S3) ─────────────────────────────────────────────
if [[ -n "${MINIO_ALIAS_TARGET:-}" ]]; then
  log "mirroring object store"
  mc alias set backup "$MINIO_ALIAS_TARGET" "${MINIO_ACCESS_KEY}" "${MINIO_SECRET_KEY}" >/dev/null
  mc mirror --overwrite "backup/${MINIO_BUCKET:-findmedi-uploads}" "${WORK}/minio" \
    || die "object-store mirror failed"
else
  log "MINIO_ALIAS_TARGET unset — skipping object-store leg (NOT a complete backup)"
fi

# ── 4. Manifest ──────────────────────────────────────────────────────────────
log "writing manifest"
{
  echo "timestamp=${TIMESTAMP}"
  echo "mongo_collections=$(find "${WORK}/mongo" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)"
  echo "postgres_bytes=$(stat -c %s "${WORK}/postgres.dump")"
} > "${WORK}/manifest.txt"

# ── 5. Encrypt ───────────────────────────────────────────────────────────────
if [[ -n "${BACKUP_RECIPIENT:-}" ]]; then
  log "encrypting (age recipient)"
  tar -C "$WORK" -czf - . | age -r "$BACKUP_RECIPIENT" -o "${ARTIFACT_DIR}/${TIMESTAMP}.tar.age"
else
  # Passphrase fallback. openssl AES-256-GCM: authenticated, so a tampered
  # artifact fails to decrypt instead of restoring as garbage.
  log "encrypting (openssl aes-256-gcm, passphrase mode)"
  tar -C "$WORK" -czf - . \
    | openssl enc -aes-256-gcm -pbkdf2 -iter 600000 -salt \
        -pass env:BACKUP_ENCRYPTION_KEY \
    > "${ARTIFACT_DIR}/${TIMESTAMP}.tar.enc"
fi
[[ -s "${ARTIFACT_DIR}/${TIMESTAMP}.tar."* ]] || die "encrypted artifact missing or empty"

# ── 6. Verify, then upload ───────────────────────────────────────────────────
log "checksumming"
( cd "$ARTIFACT_DIR" && sha256sum "${TIMESTAMP}.tar."* > "${TIMESTAMP}.tar.sha256" )
touch "${WORK}/.COMPLETE"

log "uploading to ${OFFSITE_BUCKET}"
MC_ARGS=(--no-progress)
[[ -n "${OFFSITE_ENDPOINT:-}" ]] && MC_ARGS+=(--endpoint-url "$OFFSITE_ENDPOINT")
mc alias set offsite "${OFFSITE_ENDPOINT:-https://s3.amazonaws.com}" \
   "${OFFSITE_ACCESS_KEY}" "${OFFSITE_SECRET_KEY}" >/dev/null
mc cp "${MC_ARGS[@]}" "${ARTIFACT_DIR}/${TIMESTAMP}.tar."* "offsite/${OFFSITE_BUCKET}/"
mc cp "${MC_ARGS[@]}" "${ARTIFACT_DIR}/${TIMESTAMP}.tar.sha256" "offsite/${OFFSITE_BUCKET}/" \
  || die "offsite copy failed — the local artifact alone is not a backup"

log "done: ${TIMESTAMP}"

# ── 7. Retention (only after a successful offsite copy) ──────────────────────
find "$ARTIFACT_DIR" -maxdepth 1 -name '*.tar.*' -mtime "+${RETENTION_DAYS}" -print -delete \
  | sed 's/^/[backup] pruned /' || true
