# ==============================================================================
# INF-B-04: BACKUP, RESTORE AND SECRET-ROTATION RUNBOOK
# ==============================================================================
#
# Before this directory existed, recovery was "hope": no `mongodump` schedule,
# no offsite target, no restore drill, no documented RPO/RTO. The image plus
# `backup-all.sh` / `restore-drill.sh` / `verify-secret-rotation.sh` make that
# measurable.
#
# OBJECTIVES
#   RPO  <= 15 minutes   (Mongo continuous backup + nightly verified dump)
#   RTO  <=  1 hour      (restore drill measured quarterly)
#
# WHAT IS BACKED UP
#   MongoDB    patients, records, appointments, prescriptions, chat, audit log
#   PostgreSQL payments, invoices, insurance, payouts, commission, ledger
#   MinIO      uploaded reports, prescriptions, avatars (when MINIO_ALIAS_TARGET is set)
#   Config     compose overlay + k8s manifests — never live secrets
#
# ENCRYPTION
#   Every artifact is encrypted before it leaves the host: `age` with an X25519
#   recipient (preferred) or openssl AES-256-GCM as the passphrase fallback.
#   GCM is authenticated, so a tampered artifact fails to decrypt instead of
#   quietly restoring as garbage.
#
# OFFSITE TARGET (mandatory, not best-effort)
#   OFFSITE_BUCKET is required; a backup that never leaves the primary host is not
#   a backup. Artifacts are pruned only AFTER the offsite copy has been verified.
#
# DAILY RUN (performed by the `backup` compose service)
#   1. mongodump --gzip --oplogReplay      -> /artifacts/<ts>/mongo
#   2. pg_dump --format=custom --compress  -> /artifacts/<ts>/postgres.dump
#   3. mc mirror (object store, optional)  -> /artifacts/<ts>/minio
#   4. tar + encrypt                       -> /artifacts/<ts>.tar.age|.enc
#   5. SHA256 manifest + offsite copy
#   6. prune anything older than RETENTION_DAYS
#
# RESTORE DRILL (quarterly, and after any schema migration)
#   docker compose -f docker-compose.yml -f docker-compose.prod.yml \
#     --profile backup run --rm backup-drill
#   Restores the newest artifact into throwaway databases and asserts the
#   manifest against reality, then enforces the 60-minute RTO budget. A green
#   drill is the only evidence the RTO claim holds. The drill databases contain
#   real PHI — destroy them afterwards.
#
# SECRET ROTATION (INF-B-05) — every 90 days, and immediately on any suspected
# exposure. Order matters: rotating a signing key revokes sessions, so do it in a
# maintenance window and keep the previous value for the drain period.
#
#   1. JWT signing key
#      Deploy the new value as JWT_SECRET while the previous one stays in
#      JWT_SECRET_PREVIOUS for a 15-minute drain window (the verifier then
#      accepts both, so in-flight requests survive the cutover). After the
#      window, drop JWT_SECRET_PREVIOUS: outstanding access tokens stop working
#      and users re-authenticate. That is deliberate — it is what makes
#      revocation real rather than advisory.
#   2. Session / OTP store: delete the `auth:*` and `otp:*` keys (or FLUSHDB on a
#      dedicated logical DB) to force a global logout.
#   3. Datastore credentials (Mongo, Postgres, Redis, OpenSearch, MinIO): rotate
#      in the secret manager, then recreate the services. Values come from the
#      manager, never from a committed file.
#   4. Third-party keys (Brevo, Cloudinary, Google OAuth, LiveKit, Razorpay,
#      Gemini): rotate in the provider console, deploy, then REVOKE the old key.
#      Overlapping validity windows are the usual reason a rotation never
#      actually finishes.
#   5. TLS certificate: certbot renews twice daily; force one with
#      `docker compose --profile certbot run --rm certbot renew --force-renewal`.
#   6. Backup key: generate a NEW age recipient and retain the previous private
#      key for the retention period so older artifacts stay restorable.
#
#   Verify after every rotation:
#     infra/backup/verify-secret-rotation.sh
#     node backend/scripts/check-tenant-guard-regression.mjs
#     cd backend && npm test
#     curl -fsS https://<host>/readyz        # must report ready
#
# SECRETS IN THIS DIRECTORY
#   `secrets/` is mounted read-only, holds only operator-provided files and is
#   git-ignored. Nothing in it may ever be committed.
