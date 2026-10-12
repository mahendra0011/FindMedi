# Production Environment & Secrets Checklist (F1)

**Application:** FindMedi Hospital Management System  
**Target Environments:** Staging, UAT, Production  
**Secrets Management:** Platform-injected environment variables or `/run/secrets/findmedi.env`  

---

## 1. Secrets Management Policy
- **Zero Secrets in Repository:** Gitleaks scans on all commits (`.gitleaks.toml`). No production credentials may ever be committed.
- **Provider Support:** The backend supports injection via standard environment variables or external secret rendering tools (Doppler, HashiCorp Vault, AWS Secrets Manager) using `SECRETS_FILE=/run/secrets/findmedi.env`.
- **Validation Script:** Run `cd backend && node scripts/check-env-docs.mjs` to ensure zero drift between code expectations and configuration manifests.

---

## 2. Core Infrastructure Variables

| Variable | Description | Production Requirement | Fail-Closed Behavior |
|:---|:---|:---|:---|
| `NODE_ENV` | Environment mode | `production` | Enables strict security guards, HSTS, secure cookies. |
| `PORT` | HTTP port | `5001` (or orchestrator assigned) | Default 5001. |
| `CLIENT_URL` | Frontend origin | `https://findmedi.in` (comma-separated for multi-domain) | Strict CORS matching; unauthorized origins blocked. |
| `MONGO_URI` | MongoDB Connection String | **MUST be a Replica Set** (`mongodb+srv://...` or `rs0`) | Multi-document transactions (e.g. pharmacy dispense) require replica sets. |
| `REDIS_URL` | Redis cluster / instance | `redis://...` | Enables BullMQ asynchronous workers, Socket.IO multi-node clustering, and distributed rate limits. |
| `DATABASE_URL` | PostgreSQL URL (Prisma) | `postgresql://...` | Used for ledger persistence and legal audit trails. |
| `ENABLE_PG_DUAL_WRITE`| Polyglot dual-write | `true` (after `npx prisma migrate deploy`) | Dual-writes billing and ledger records to PostgreSQL. |

---

## 3. Cryptographic & Security Keys

| Variable | Generation / Format | Notes |
|:---|:---|:---|
| `JWT_SECRET` | 64+ random hex/base64 chars | Minimum 32 bytes (`openssl rand -hex 48`). Used if `JWT_KEYS` not provided. |
| `JWT_KEYS` | JSON Array: `[{"kid":"...","secret":"...","status":"active"}]` | **Recommended:** Enables zero-downtime keyset rotation. Older keys marked "retiring". |
| `FIELD_ENCRYPTION_KEY` | 64 hex characters (32 bytes AES-256) | Application-layer encryption for patient PHI (Aadhaar, vitals, medical records). |
| `FIELD_ENCRYPTION_KEYS`| JSON Object: `{"1":"hex","2":"hex"}` | Keyset rotation dictionary for field encryption. |
| `PASSWORD_PEPPER` | 32+ hex characters | Server-side secret pepper applied to Argon2id / bcrypt password hashes. |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile Secret | Protects login, registration, and OTP request endpoints against bot floods. |
| `TURNSTILE_STRICT` | `true` | Fails closed (503) if Cloudflare Turnstile verification times out or is unreachable. |

---

## 4. Payment Gateway Live Credentials & Webhook Secrets (E3)

| Gateway | Credentials Needed | Webhook Secret Variable |
|:---|:---|:---|
| **Razorpay** | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | `WEBHOOK_SECRET_RAZORPAY` |
| **Cashfree** | `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_ENV=PRODUCTION` | `WEBHOOK_SECRET_CASHFREE` |
| **PayU** | `PAYU_MERCHANT_KEY`, `PAYU_MERCHANT_SALT`, `PAYU_ENV=production` | `WEBHOOK_SECRET_PAYU` |
| **PhonePe** | `PHONEPE_MERCHANT_ID`, `PHONEPE_SALT_KEY`, `PHONEPE_SALT_INDEX` | `WEBHOOK_SECRET_PHONEPE` |
| **Replay Protection** | `REQUIRE_WEBHOOK_REPLAY_PROTECTION=true` | Rejects replayed webhook delivery attempts using Redis nonce tracking. |

---

## 5. Statutory & Specialized Integrations (E1, E2)

### 5.1 GST E-Invoicing (NIC IRP)
- `EINVOICE_MODE=live`
- `EINVOICE_GSTIN`: Hospital GSTIN (15 characters)
- `EINVOICE_USERNAME`: NIC e-invoice credentials
- `EINVOICE_PASSWORD`: NIC portal password
- `EINVOICE_CLIENT_ID`: GSP / NIC API client ID
- `EINVOICE_CLIENT_SECRET`: GSP / NIC API client secret
- `EINVOICE_BASE_URL`: `https://api.einvoice.gov.in/einvoice/v1.0`

### 5.2 PACS / DICOM Imaging (Orthanc & OHIF)
- `ORTHANC_HOST`: PACS server hostname or internal Docker service name
- `ORTHANC_PORT`: `4242` (DIMSE TCP port)
- `ORTHANC_AE`: `RIS_AE`
- `ORTHANC_CALLED_AE`: `PACS_AE`
- `ORTHANC_HTTP_URL`: `http://pacs.internal:8042`
- `OHIF_URL`: Public HTTPS viewer URL (e.g. `https://pacs.findmedi.in/ohif/viewer`), or blank for Orthanc fallback.

### 5.3 Notifications & Cloud Storage
- `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`: Transactional email delivery.
- `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`: Indian DLT-compliant SMS.
- `MSG91_TEMPLATE_ID`: Approved DLT template ID.
- `MSG91_INTEGRATED_NUMBER`, `WHATSAPP_TEMPLATE_ID`: WhatsApp Business messaging.
- `CLOUDINARY_URL`: Medical document and avatar storage.
