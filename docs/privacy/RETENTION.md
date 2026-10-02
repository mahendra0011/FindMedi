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