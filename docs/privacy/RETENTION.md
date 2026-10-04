# Data Retention Schedule

Retention is a **control**, not a housekeeping task: a record that outlives its
purpose is an ongoing liability regardless of whether anyone is reading it. This
schedule states, per data class, how long it is kept and what removes it.

Every hard delete below is **audited**. An unlogged deletion is indistinguishable
from data loss, which is precisely the failure a retention policy exists to
prevent.

| Data class | Retention | Removal mechanism | On delete |
|---|---|---|---|
| Clinical records (appointments, prescriptions, labs, EHR) | Statutory period for the jurisdiction, minimum 3 years | Soft delete, then hard delete on schedule | `delete_record` audit row |
| Mental-health records | Same as clinical records, **plus** the consent validity period | `revoke_consent` removes downstream read access immediately; the record itself follows the clinical schedule | Audited |
| ABDM consent records | Consent validity, then 1 year | TTL/consent expiry; revocation is immediate and audited | `consent_revoke` audit row |
| Audit logs | **7 years** (longer than the data they describe) | Scheduled archive — never inline with the records they evidence | Archived with checksum |
| Payment and ledger entries | 8 years (statutory accounting) | Hard delete after archive | `delete_ledger_entry` audit row |
| Refund records | 8 years | As above | Audited |
| Notifications | 90 days | TTL index | Not audited (low value) |
| Ambulance / doctor setup codes | **15 minutes** | Mongo TTL index on `expiresAt` | Not audited; consumption is |
| Password-reset and OTP records | 15–60 minutes | TTL index | Not audited |
| Access tokens | Short-lived by design (minutes) | Stateless expiry | — |
| Refresh tokens | Until logout or expiry | Rotated on use; server-side revocation on logout | `logout` audit row |
| Ride and SOS location traces | Duration of the trip + 30 days for dispute resolution | TTL index | Not audited after deletion |
| Uploaded media (Cloudinary) | Life of the owning record + 90 days | Media cleanup job | Audited |
| Provider KYC documents | Life of the provider relationship + 1 year | Provider deletion flow | Audited |
| Application logs | 30 days, rotated | Log rotation | Not audited |
| Analytics events (Kafka/ClickHouse/Pinot) | 24 months | Warehouse retention policy | Not audited |

## Rules that override the table

1. **Legal hold wins.** If a record is under legal hold, no retention rule may
   delete it. This is the only exception, and it must be recorded.
2. **Audit logs outlive their subject.** Do not shorten an audit log because the
   record it describes has been deleted — the log is what proves the deletion
   happened.
3. **Deletion is not a silent operation.** Every hard delete of PHI writes an
   audit row. This is why `records.js` uses a soft delete first: it gives the
   audit trail a stable moment to record.
4. **A shorter period is a deliberate decision.** Reducing any period in this
   table requires a corresponding change to the DPIA, because it changes what the
   system is assessed to have done.

## Known gaps

- **Unmapped PII collections are explicitly tracked.** The generated
  [`data-dictionary.md`](../data-dictionary.md) currently lists 17 collections
  whose retention class still needs a policy decision. They are pinned in
  `backend/scripts/retention-gap-baseline.json`; `npm run retention:gaps` fails
  if a code change introduces a new unclassified PII collection or if a tracked
  collection changes without deliberate review. This is a regression guard,
  not a retention period or evidence that existing records have been purged.
- **Do not add a TTL based on the baseline alone.** Chat, support, safety and
  clinical-adjacent records may be subject to care, consent, dispute or legal
  hold requirements. A policy owner must assign their class and resolve legal
  hold behavior before automated deletion is enabled.

- **Enforcement is partial.** TTL indexes handle the token, notification and
  trace rows. Clinical records depend on a scheduled job; there is no single
  component that owns "delete everything that is due".
- **No automated verification.** Nothing currently asserts that the retention
  job actually ran. A failed delete is silent, which is the same class of problem
  as the stale data pipeline — and the natural next fix is the same shape:
  a freshness/age metric on the retention job itself.
- **Third-party retention is out of scope.** Cloudinary and the email provider
  hold their own copies; their retention is governed by their contracts, not by
  this file.

## Control-to-code mapping (DOC-M-01, 2026-10-04)

| Data class (table above) | Enforcement in code | Evidence / gate |
|---|---|---|
| Setup codes 15 min; OTP 15–60 min | `backend/src/models/AmbulanceSetupCode.js:31` (TTL `expireAfterSeconds: 0` on `expiresAt`); `backend/src/models/OTP.js:32` (TTL 3600s); `backend/src/models/RefreshToken.js:44` (TTL on `expiresAt`) | Mongo TTL; login-event TTL `backend/src/models/LoginEvent.js:40` (180d) |
| Clinical soft-delete → audited hard-delete | `backend/src/routes/records.js:456-461` (soft delete first, then `auditLog('delete_record', …, { soft: true })`) | `delete_record` audit row; DPIA §10 |
| Consent records: revoke is immediate + audited | `backend/src/routes/records.js:576,592-602` (`consent_revoked` audit on both revoke paths); mental-health consent expiry enforced `backend/src/routes/mentalhealth.js:257-264` | `mentalHealthConsent.spec.js` |
| Audit logs outlive their subject | `backend/src/models/AuditLog.js:47` (TTL 365d — check against the 7-year policy target; shortening needs a DPIA change per Rule 4) | Retention-gap gate `backend/test/unit/retentionGate.spec.js` |
| Chat offline queue is NOT retention storage | `frontend/src/lib/chatPrefs.js:93-119` (device-local queue, flushed on reconnect) + resume cursors `frontend/src/lib/chatResume.js:43-56`; queue items are pending sends, not an archive — server retention class applies after durable write | `docs/chat-reconnect-contract.md`; Vitest `chatResume.test.js` |

## Control-to-code mapping (DL-M-09 / DOC-M-01)

Each retention class below names the code that enforces it, so a policy
change has an obvious code counterpart and a code change has an obvious
policy counterpart. The CI gate is `npm run retention:gaps`
(`backend/scripts/check-retention-gaps.mjs` vs
`backend/scripts/retention-gap-baseline.json`); the classifier is
`backend/scripts/lib/dataDictionary.mjs` and the generated evidence is
`docs/data-dictionary.md` (freshness pinned by
`backend/test/unit/dataDictionary.spec.js` + `retentionGate.spec.js`).

| Retention class (this file) | Enforcement in code | Evidence / gate |
|---|---|---|
| Clinical records (statutory, min 3y) | Scheduled hard-delete job after soft delete; `records.js` soft-delete first so the audit row has a stable moment | `docs/data-dictionary.md` retention column; `retentionGate.spec.js` requires every PII collection mapped or allowlisted |
| Mental-health records (+ consent validity) | `revoke_consent` removes downstream read access immediately; record follows clinical schedule | `mentalHealthConsent.spec.js`; DPIA §4 consent-scope guard |
| ABDM consent records (validity + 1y) | TTL/consent expiry; revocation immediate + audited (`consent_revoke`) | `ConsentRecord` expiry index; audit row |
| Audit logs (7y) | Scheduled archive, never inline with the records they evidence | Archive checksum; retention class `Audit logs` in `dataDictionary.mjs` |
| Payment and ledger entries (8y) | Hard delete after archive | `delete_ledger_entry` audit row |
| Notifications (90d) | Mongo TTL index | `ttlSeconds` surfaced in data dictionary |
| OTP / setup codes / tokens (15–60m) | Mongo TTL index; refresh rotation + server-side revocation | `OTP`/`RefreshToken` TTL assertions in `dataDictionary.spec.js` |
| Ride and SOS location traces (trip + 30d) | TTL index | `RideBooking` retention class assertion |
| Provider KYC (relationship + 1y) | Provider deletion flow | `Doctor`/`Staff` retention class assertion |
| Unmapped PII (no class yet) | Explicitly tracked, never guessed: `retention-gap-baseline.json` | `npm run retention:gaps` fails on additions/removals; `retentionGate.spec.js` |
