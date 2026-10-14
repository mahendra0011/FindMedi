# Policy Acceptance Log (versioned ToS / consent ledger)

> Wiring: `backend/src/models/PolicyAcceptance.js` (append-only row per
> user × template × version) + helper `backend/src/lib/policyAcceptance.js`
> (`recordPolicyAcceptance`, `hasAccepted`, `getLatestAcceptance`).
> Rule: acceptances are never edited or revoked — a new template version gets
> a new row. Gate state-changing flows on `hasAccepted(userId, templateId,
> templateVersion)` for the CURRENT version; on version bump, re-prompt and
> record again.

## Current templates

| Template | Version | Context | Effective |
|---|---|---|---|
| `terms_of_service` | `v1.0` | `terms_of_service` | 2026-10-08 |
| `privacy_policy` | `v1.0` | `privacy_policy` | 2026-10-08 |
| `provider_agreement` | `v1.0` | `provider_agreement` | 2026-10-08 |
| `teleconsult_consent` | `v1.0` | `teleconsult_consent` | 2026-10-08 |
| `booking_cancellation` | `v1.0` | `booking_cancellation` | 2026-10-08 |
| `tmpl_<group>` (join wizard's group agreement — `tmpl_clinical`, `tmpl_wellness`, … off `providerTypeCatalog.js`) | `v<configVersion>` (the config the applicant actually saw) | `provider_agreement` | 2026-10-13 |

## Acceptance history

| Date (UTC) | Template | Version | Context | Notes |
|---|---|---|---|---|
| 2026-10-08 | all five | `v1.0` | — | Initial ledger + helper wired; no backfill (acceptances start recording from this date) |
| 2026-10-13 | `tmpl_<group>` per application | `v<configVersion>` | `provider_agreement` | Join submit (`POST /join/:id/submit`) records the applicant's acceptance of the agreement the wizard's agreement step showed; idempotent per (user, template, version), fail-soft on ledger outage |

## How to record (backend)

```js
import { recordPolicyAcceptance } from '../lib/policyAcceptance.js';

await recordPolicyAcceptance({
  userId: req.user._id,
  templateId: 'terms_of_service',
  templateVersion: 'v1.0', // must match the CURRENT version above
  context: 'terms_of_service',
  ip: req.ip,
  userAgent: req.get('user-agent'),
  documentHash: '<sha256 of the rendered document>',
});
```
