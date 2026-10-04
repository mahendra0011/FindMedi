# Data Protection Impact Assessment (DPIA)

**System:** FindMedi — telemedicine platform (appointments, prescriptions, labs,
pharmacy, rides, ambulance, legal, mental-health, insurance, loyalty)
**Controller:** FindMedi
**Version:** 1.0 · **Last reviewed:** with the security remediation pass
**Framework:** India DPDP Act 2023 (notably §4 special-category data, §8 breach
notification), HIPAA Security Rule where applicable.

> This DPIA is written against the implemented system, not against a design
> document. Where a control is missing it is recorded in §7 as a gap rather than
> written around.

---

## 1. Purpose of processing

FindMedi connects patients with healthcare providers (doctors, hospitals,
diagnostic labs, pharmacies, mental-health professionals, legal professionals,
riders and ambulance operators) to deliver care and the logistics around it.

Processing purposes:

1. **Delivering care** — booking, conducting and documenting consultations.
2. **Fulfilment** — dispensing prescriptions, running lab orders, dispatching
   medicines and emergency transport.
3. **Payments** — charging patients, paying providers, issuing refunds.
4. **Safety** — emergency SOS dispatch, crisis escalation for mental-health
   referrals.
5. **Legal compliance** — ABDM/ABHA consent records, statutory retention.

## 2. Necessity and proportionality

Each data class is necessary for at least one purpose above; nothing is collected
speculatively for "future analytics".

Notably **not** collected or stored:

- **Aadhaar numbers.** Rejected at write time by a CI-enforced guard. The
  platform needs to verify identity for some flows, not to retain the number.
- **Card numbers.** Payment data goes to Razorpay; no PAN/CVV touches our
  servers.
- **Precise location beyond the trip.** Ride and SOS locations are stored for
  the duration of the journey and for dispute resolution, not as a movement
  history.

## 3. Data subjects

- **Patients** — the largest and most sensitive group.
- **Healthcare providers** — doctors, labs, pharmacies, therapists, lawyers.
- **Operators** — riders, ambulance drivers, assistants.
- **Hospital staff and administrators.**
- **Minor patients**, whose records are handled under a guardian's authority.

## 4. Special-category data (DPDP §4)

The most sensitive processing in the system is **mental health**.

| Control | Implementation |
|---|---|
| Classification is server-owned | `dataClassification: 'PSYCHIATRIC_SPECIAL_CATEGORY'`, set on creation and not settable by a client (`routes/mentalhealth.js`) |
| Purpose limitation is recorded | `purposeOfProcessing` — Assessment, Direct Care, Crisis Intervention, Court Ordered, Insurance Claim, Family Support |
| Consent basis recorded | `consentBasis.grantedBy`, `scope`, `consentRecordedAt` (a **server** timestamp, so consent cannot be backdated) |
| Explicit refusals recorded | `explicitlyRefused.{marketing,research,thirdPartyDisclosure}` — storing the denial is what makes the restriction auditable |
| Restricted access | `assertMentalHealthAccess()`: patient always; clinicians only same-tenant and fail-closed; family/insurer roles only if the consent scope includes them |
| Reads are audited | `read_mental_health_referral` audit row per access, naming who read whose record |
| Cross-tenant denial is 404 | Existence is never confirmed |

Clinical PHI (appointments, prescriptions, labs, EHR, ABDM consents) is handled
under the same access model, without the special-category marker.

## 5. Data flows

```
Patient ──HTTPS──▶ API (Express) ──▶ MongoDB (replica set, TLS)
                      │   │
                      │   ├──▶ Cloudinary   (images/documents, signed URLs)
                      │   ├──▶ OpenSearch   (search index; redactClinicalText applied)
                      │   ├──▶ Kafka        (domain events; SASL_SSL)
                      │   ├──▶ Redis        (rate limits, replay cache, sessions)
                      │   ├──▶ Brevo        (transactional email — no OTPs)
                      │   ├──▶ Razorpay     (payments)
                      │   ├──▶ Twilio       (SMS/OTP)
                      │   └──▶ MapTiler     (maps)
```

Each processor, the data it receives, and its classification are listed in
`SECURITY.md` §6. Adding a processor requires updating that table **and** this
document before it receives production data.

## 6. Retention

Retention periods are specified in `RETENTION.md`. The principle:

- Clinical records are retained for the statutory period, then soft-deleted and
  hard-deleted — and the deletion itself is audited.
- Tokens, OTPs and setup codes expire quickly and are removed automatically
  (`AmbulanceSetupCode` uses a Mongo TTL index).
- Audit logs are retained **longer** than the data they describe, because they
  are the evidence that a deletion or an access actually happened.

## 7. Risks and gaps

| # | Risk | Severity | Status |
|---|---|---|---|
| 1 | Mental-health disclosure to a wrong-tenant clinician | Critical | Mitigated — fail-closed guard, audited reads |
| 2 | Crisis flag not seen by a human | Critical | Mitigated — SLA deadline, acknowledgement required before resolution, breach logged |
| 3 | Cross-tenant bulk export | High | Mitigated — row cap + audit row; superadmin-only |
| 4 | Compromise of a third-party processor | High | **Accepted** — DPA/contract management is an organisational control, outside this repository |
| 5 | Re-identification from the search index | Medium | Partially mitigated — `redactClinicalText()` on indexed clinical text |
| 6 | Insider access by a tenant admin | High | Partially mitigated — every read is audited; there is no alerting on bulk reads |
| 7 | Unclassified routes leaving a gap in the access-control surface | Medium | **Open** — tracked in `SECURITY.md` §5 |
| 8 | Breach not noticed because a pipeline is silently stale | Medium | Mitigated — `/healthz/pipelines` |
| 9 | Physical/organisational controls (staff vetting, device policy) | Medium | **Accepted** — outside this repository |

Gaps 4, 6, 7 and 9 are explicitly **not** closed by anything in this codebase.
They are stated here so that no reader mistakes this document for a compliance
certificate.

## 8. Data principal rights

| Right | Mechanism |
|---|---|
| Access | The subject's own data is returned by their own scoped endpoints; there is no bulk "download everything" for a user |
| Correction | Profile and record update endpoints, tenant-scoped and audited |
| Erasure | Soft-delete with an audit row; hard-delete follows the retention schedule |
| Consent withdrawal | The ABDM consent revoke endpoint, which immediately removes downstream read access |
| Grievance | Support channel; escalations reviewed against `AuditLog` |

## 9. Breach notification

See `SECURITY.md` §7 and the operational playbook
[`docs/incident-response.md`](../incident-response.md). In summary: contain,
preserve evidence, assess scope, notify each affected Data Principal and the
Data Protection Board without delay for **any** personal data breach (DPDP §8
/ Rules 2025 Rule 7 — detailed Board report within 72 hours; CERT-In within 6
hours for Annexure I incident types), then write a post-mortem with a
regression test.

## 10. Control-to-code mapping (DL-M-09 / DOC-M-01)

Retention and erasure duties above are not prose-only; each names its
enforcement point. The retention gate (`backend/scripts/check-retention-gaps.mjs`
+ `backend/scripts/retention-gap-baseline.json`, pinned by
`backend/test/unit/retentionGate.spec.js`) fails the build when a PII
collection has no retention class and no explicit allowlist entry.

| Duty (this DPIA) | Enforcement in code | Evidence / gate |
|---|---|---|
| Erasure scrubs identity, keeps clinical consistency | `backend/src/services/deletionService.js` `executeDeletion()` (revoke sessions → `purgeUserFromSearch` → anonymize → revoke credentials) | `test/security/deletionWorkflow.spec.js`; `test/unit/deletionPropagation.spec.js` |
| Search-tier erasure (`purgeUserFromSearch`) | `backend/src/services/opensearchIndexer.js` `purgeUserFromSearch()` (provider raw id + EHR pseudonym, `_delete_by_query` with `slices:auto`) | `deletionPropagation.spec.js` same-id + tombstone assertions |
| Analytics fan-out (`user.deleted`) | Outbox tombstone via `emitUserDeletedTombstone()` → `kafkaConsumerService` `user.deleted` branch → `purgeUserFromSearch` + `purgeUserFromLakeManifests`; partial purge fails the event so outbox retry finishes it | `kafkaConsumerFailure.spec.js` tombstone test; `outboxCrashReplay.spec.js` `event:done` ordering |
| Retention classes for every PII collection | `backend/scripts/lib/dataDictionary.mjs` `RETENTION_RULES` + `docs/privacy/RETENTION.md` classes | `docs/data-dictionary.md` (`npm run docs:dictionary`); `retentionGate.spec.js` |
| Consent withdrawal removes access immediately | ABDM consent revoke endpoint; mental-health `assertMentalHealthAccess()` + consent-scope check | `mentalHealthConsent.spec.js`; DPIA §4 table |

### 10.1 Phase 5 additions (DOC-M-01, 2026-10-04)

| Duty (this DPIA) | Enforcement in code | Evidence / gate |
|---|---|---|
| Special-category marker is server-owned (§4) | `backend/src/models/MentalHealth.js:94-95` (`dataClassification` default `PSYCHIATRIC_SPECIAL_CATEGORY`); set on creation `backend/src/routes/mentalhealth.js:114-115`, never from client input | `mentalHealthConsent.spec.js` |
| Purpose limitation + server-timestamped consent (§4) | `backend/src/models/MentalHealth.js:98-111` (`purposeOfProcessing`, `consentRecordedAt`); creation stamps `new Date()` server-side `backend/src/routes/mentalhealth.js:119` | Same suite |
| Restricted reads, fail-closed, audited (§4) | `backend/src/services/mentalHealthAccess.js:93` (`assertMentalHealthAccess`); call sites e.g. `backend/src/routes/mentalhealth.js:195,252,295` | Access-denial tests |
| Consent UI cannot bypass server (§2/§8 correction path) | `frontend/src/lib/bookingValidation.js:53` (`canSubmitWithConsent`); exercised by `frontend/src/components/consent/ConsentGate.jsx` + `ConsentGate.test.jsx` (submit disabled without checkbox) | Vitest: `ConsentGate.test.jsx` (3 tests) |
| SOS location minimisation (§2: no movement history) | `frontend/src/components/emergency/SOSConfirmModal.tsx:86-90` (no-GPS → no dispatch); rule locked by `frontend/src/lib/bookingValidation.js:63` (`validateSOSPayload`) + `SOSFlow.test.jsx` | Vitest + e2e role flows |
| Chat transport keeps meaning, not extra copies (§5 search-index note) | Reconnect/resume contract `docs/chat-reconnect-contract.md`; client dedupe `frontend/src/lib/chatResume.js:67` (`mergeMessages` on `_id` + `clientGeneratedId`); server join gate `backend/src/services/socketService.js:630-636` (`chat:join` → `assertRoomAccess`) | Vitest: `chatResume.test.js` (duplicate-delivery safe) |
| Search index carries no raw clinical text (§7 risk 5) | `backend/src/services/opensearchIndexer.js:379` (`redactClinicalText`), applied at indexing `:397` | Existing indexer tests |