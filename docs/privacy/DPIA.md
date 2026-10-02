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