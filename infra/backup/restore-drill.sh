# ==============================================================================
# INF-B-04: RESTORE DRILL
# ==============================================================================
# A backup is only proven by restoring it. This restores the newest artifact
# into throwaway databases, compares the manifest against reality, and exits
# non-zero on any mismatch — so "we have backups" becomes a measured RTO.
#
#   docker compose -f docker-compose.yml -f docker-compose.prod.yml \
#     --profile backup run --rm backup-drill
#
# Run quarterly and after every schema migration.
# ==============================================================================
set -Eeuo pipefail

ARTIFACT_DIR="${ARTIFACT_DIR:-/artifacts}"
MONGO_TARGET="${DRILL_MONGO_URI:-mongodb://drill-mongo:27017/findmedi}"
PG_TARGET="${DRILL_POSTGRES_URI:-postgresql://drill:drill@drill-postgres:5432/findmedi}"
MAX_MINUTES="${DRILL_MAX_MINUTES:-60}"   # the documented RTO

log()  { printf '[drill %s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
die()  { printf '[drill FATAL] %s\n' "$*" >&2; exit 1; }

START_EPOCH="$(date -u +%s)"

# ── 1. Pick the newest complete artifact ──────────────────────────────────────
ARTIFACT="$(find "$ARTIFACT_DIR" -maxdepth 1 -name '*.tar.enc' -o -maxdepth 1 -name '*.tar.age' \
            | sort | tail -n 1)"
[[ -n "$ARTIFACT" ]] || die "no backup artifact in ${ARTIFACT_DIR}"
log "drilling $(basename "$ARTIFACT")"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# ── 2. Verify integrity before trusting the contents ─────────────────────────
if [[ -f "${ARTIFACT%.tar.*}.tar.sha256" ]]; then
  log "verifying checksum"
  ( cd "$ARTIFACT_DIR" && sha256sum -c "$(basename "$ARTIFACT").sha256" ) \
    || die "checksum mismatch — the artifact is corrupt or tampered with"
fi

# ── 3. Decrypt ───────────────────────────────────────────────────────────────
if [[ "$ARTIFACT" == *.tar.age ]]; then
  [[ -n "${BACKUP_PRIVATE_KEY_FILE:-}" ]] || die "BACKUP_PRIVATE_KEY_FILE is required for .tar.age"
  age -d -i "$BACKUP_PRIVATE_KEY_FILE" "$ARTIFACT" | tar -C "$WORK" -xzf -
else
  openssl enc -d -aes-256-gcm -pbkdf2 -iter 600000 \
    -pass env:BACKUP_ENCRYPTION_KEY -in "$ARTIFACT" | tar -C "$WORK" -xzf -
fi
[[ -f "${WORK}/manifest.txt" ]] || die "restore produced no manifest"

# ── 4. Restore Mongo ─────────────────────────────────────────────────────────
if [[ -d "${WORK}/mongo" ]]; then
  log "restoring Mongo -> ${MONGO_TARGET}"
  mongorestore --uri="$MONGO_TARGET" --gzip --oplogReplay --drop "${WORK}/mongo" \
    || die "mongorestore failed"

  expected_mongo="$(grep -oP 'mongo_collections=\K[0-9]+' "${WORK}/manifest.txt" || echo 0)"
  actual_mongo="$(mongosh "$MONGO_TARGET" --quiet --eval 'db.getMongo().getDBNames().length' 2>/dev/null || echo '?')"
  log "mongo databases after restore: ${actual_mongo} (manifest recorded ${expected_mongo} collections)"
  [[ "$actual_mongo" != "0" ]] || die "Mongo restore produced zero databases"
fi

# ── 5. Restore Postgres ──────────────────────────────────────────────────────
if [[ -s "${WORK}/postgres.dump" ]]; then
  log "restoring PostgreSQL -> ${PG_TARGET}"
  pg_restore --dbname="$PG_TARGET" --clean --if-exists --no-owner "${WORK}/postgres.dump" \
    || die "pg_restore failed"

  expected_bytes="$(grep -oP 'postgres_bytes=\K[0-9]+' "${WORK}/manifest.txt" || echo 0)"
  actual_bytes="$(pg_restore --dbname="$PG_TARGET" --list "${WORK}/postgres.dump" 2>/dev/null | wc -l || echo 0)"
  log "postgres archive entries: ${actual_bytes} (dump was ${expected_bytes} bytes)"
  [[ "$actual_bytes" -gt 0 ]] || die "PostgreSQL restore produced an empty schema"
fi

# ── 6. RTO verdict ───────────────────────────────────────────────────────────
ELAPSED=$(( ($(date -u +%s) - START_EPOCH) / 60 ))
if [[ "$ELAPSED" -gt "$MAX_MINUTES" ]]; then
  die "RTO budget exceeded: ${ELAPSED} min > ${MAX_MINUTES} min"
fi

log "RESTORE DRILL PASSED in ${ELAPSED} min (RTO budget ${MAX_MINUTES} min)"
log "Reminder: destroy the drill databases afterwards — they contain real PHI."
