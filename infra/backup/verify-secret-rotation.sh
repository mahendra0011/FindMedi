# ==============================================================================
# INF-B-05: SECRET ROTATION VERIFICATION
# ==============================================================================
# Rotation is only trustworthy if something checks it. This gate runs in CI and
# after a rotation and fails when a deployment still carries a development
# default, a committed secret, or a key that has outlived its 90-day cadence.
#
#   ./infra/backup/verify-secret-rotation.sh            # current env
#   SECRET_AGE_DAYS=80 ./infra/backup/verify-secret-rotation.sh
# ==============================================================================
set -Eeuo pipefail

MAX_AGE_DAYS="${SECRET_AGE_DAYS:-90}"
fail=0
note() { printf '[secret-check] %s\n' "$*"; }
bad()  { printf '[secret-check] FAIL: %s\n' "$*" >&2; fail=1; }

note "max secret age: ${MAX_AGE_DAYS} days"

# ── 1. No development defaults may reach a production-shaped environment ─────
WEAK_PATTERN='dev_only|changeme|password123|example|PLACEHOLDER|your-secret|xxx'
for name in MONGO_ROOT_PASSWORD POSTGRES_PASSWORD REDIS_PASSWORD \
            OPENSEARCH_ADMIN_PASSWORD MINIO_ROOT_PASSWORD JWT_SECRET \
            BREVO_API_KEY CLOUDINARY_URL GEMINI_API_KEY RAZORPAY_KEY_SECRET; do
  value="${!name:-}"
  [[ -z "$value" ]] && continue
  if printf '%s' "$value" | grep -qiE "$WEAK_PATTERN"; then
    bad "${name} still holds a development/placeholder value"
  fi
done

# ── 2. Nothing secret may be committed ───────────────────────────────────────
repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
while IFS= read -r hit; do
  [[ -z "$hit" ]] && continue
  bad "committed secret material: ${hit#"$repo_root"/}"
done < <(cd "$repo_root" && git ls-files 2>/dev/null \
          | grep -E '(\.pem$|\.key$|^\.env$|\.env\.local$|id_rsa|credentials\.json$)' || true)

# ── 3. Infrastructure identifiers must not live in source ────────────────────
# INF-B-09: an internal Redis/Mongo host in a source comment is a topology leak.
while IFS= read -r hit; do
  [[ -z "$hit" ]] && continue
  bad "infrastructure endpoint hardcoded in source: ${hit#"$repo_root"/}"
done < <(grep -rInE '(redis|mongodb(\+srv)?|postgres(ql)?|mysql|amqp)://[^ /@:]{8,}[:@]' \
           "$repo_root/backend/src" "$repo_root/infra" 2>/dev/null \
         | grep -vE '\.env|node_modules|127\.0\.0\.1|localhost|0\.0\.0\.0|drill-|//[a-z0-9_-]+:[0-9]+' \
         || true)

# ── 4. Age of the last recorded rotation ─────────────────────────────────────
if [[ -n "${LAST_SECRET_ROTATION_FILE:-}" && -f "${LAST_SECRET_ROTATION_FILE}" ]]; then
  last="$(cat "$LAST_SECRET_ROTATION_FILE")"
  age_days=$(( ( $(date -u +%s) - $(date -u -d "$last" +%s) ) / 86400 ))
  if [[ "$age_days" -gt "$MAX_AGE_DAYS" ]]; then
    bad "secrets were last rotated ${age_days} days ago (budget ${MAX_AGE_DAYS})"
  else
    note "last rotation ${age_days} days ago — within budget"
  fi
else
  note "no rotation ledger found (set LAST_SECRET_ROTATION_FILE to enforce the cadence)"
fi

if [[ "$fail" -eq 0 ]]; then
  note "OK"
else
  note "rotation gate failed — see above"
fi
exit "$fail"
