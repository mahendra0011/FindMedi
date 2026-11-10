# Secrets manager & rotation (doc 19)

## Storage
- Production secrets in a managed secrets manager (AWS Secrets Manager / GCP Secret Manager / Vault).
- Local dev uses `.env` (gitignored); `.env.example` documents required keys.

## Rotation calendar
- DB credentials: quarterly.
- JWT signing keys: on suspected compromise + annually.
- API keys (provider/integration): on demand + expiry.
- Webhook secrets: on provider request.

## Verification
- `infra/backup/verify-secret-rotation.sh` confirms last rotation within policy.
- Access audit: every secret read logged by the secrets manager.
