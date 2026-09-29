# Records / Health-ID / EHR — Missing Features

Scope: capabilities absent from `routes/records.js`, `routes/healthId.js`, `routes/patient.js`, `models/Record.js`, `models/User.js` (`healthIdCard`).
Companion file: `records-healthid-ehr-bugs.md` (12 findings).

---

## [MISS-REC-001] No record versioning or amendment history — updates destroy the previous value
- **Description**: `models/Record.js` has no `version`, `revisionOf`, `amendedAt` or change-log field, and `PUT /api/records/:id` performs a straight overwrite (`findByIdAndUpdate`). There is no history collection for records. The audit log records only *that* a record was updated with its `recordId`, never the prior or new field values.
- **Why it matters**: Clinical records are legally required to be amendable only in a way that preserves what was originally recorded (an addendum or versioned revision with author and reason). A silent overwrite means a later reader cannot tell whether a diagnosis or prescription was changed, by whom, or why — and a disputed record is unprovable.
- **Expected**: Append-only versioning (or an addendum model) with `author`, `reason`, and a full diff retrievable per record; the UI shows amendment history.
- **Suggested implementation**: Add `version` plus a `RecordRevision` collection written on every update with `{ recordId, version, before, after, changedBy, reason, at }`, require an amendment `reason` in the update schema, and expose `GET /api/records/:id/revisions`. Retrofit `PUT` to reject concurrent edits via a version check.
- **Priority**: High
- **Phase**: Phase 2
- **TODOs**:
  - [ ] `RecordRevision` collection + write-on-update
  - [ ] Required amendment `reason` in `updateRecordSchema`
  - [ ] `GET /api/records/:id/revisions`
  - [ ] Optimistic-concurrency version check on update
  - [ ] UI amendment history panel

---

## [MISS-REC-002] Records are hard-deleted, with no legal hold or retention policy
- **Description**: `DELETE /api/records/:id` calls `Record.findByIdAndDelete`, permanently removing the document. There is no soft delete (`deletedAt`/`isDeleted`), no retention schedule and no legal-hold flag. Record-retention configuration does not exist (`config/audit.js`'s retention fields are dead — see REC-011).
- **Why it matters**: Health records carry a legal minimum retention (typically years) that is incompatible with a user-triggered irreversible delete. Equally, a patient's erasure *request* has no supported path, so neither obligation is met.
- **Expected**: Soft delete by default; hard deletion only via a logged, policy-driven retention/erasure job; a legal hold that blocks deletion; documented retention windows per record type.
- **Suggested implementation**: Add `deletedAt`, `deletedBy`, `legalHold` to `Record`; make `DELETE` set them; add a scheduled retention job; expose an explicit erasure-request workflow (ties into the consent/DPDP work in `auth-security-missing.md`).
- **Priority**: Medium
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Soft-delete fields + `DELETE` semantics change
  - [ ] Filter soft-deleted records out of every read path
  - [ ] Retention policy config + scheduled job
  - [ ] `legalHold` flag that blocks deletion
  - [ ] Restore endpoint for admin/legal use

---

## [MISS-REC-003] No patient-facing access log ("who viewed my records")
- **Description**: `auditLog('download_prescription', ...)` and the other record audit events are written, but there is no endpoint or UI for a patient to see who accessed their records. The data exists; the capability does not.
- **Why it matters**: Transparency about record access is both a user-trust feature and a regulatory expectation in an EHR context. It is also the cheapest detection mechanism for insider snooping.
- **Expected**: `GET /api/records/access-log` for the authenticated patient, showing actor, role, action, timestamp and purpose, with pagination.
- **Suggested implementation**: Project existing `AuditLog` entries where `resourceId` is one of the caller's record ids (requires an index on `{ resourceType, resourceId, createdAt }`), plus a UI panel in the patient dashboard. Reuse the existing audit writer rather than adding a second logging path.
- **Priority**: Medium
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Index `AuditLog` on `{ resourceType, resourceId, createdAt }`
  - [ ] `GET /api/records/access-log` scoped to the caller
  - [ ] Patient-facing UI panel
  - [ ] Include actor role + purpose for every access type

## [MISS-REC-004] No clinical safety features: no allergy/interaction checks, no ICD validation
- **Description**: `Record.icdCodes[].code` is a free string with no validation against a code set; there is no allergy checking, no drug–drug or drug–allergy interaction check, and no dosage validation. `User.allergies` and `User.knownConditions` are captured for the health card but never consulted at the point of prescribing.
- **Why it matters**: These are what make a prescription module clinically safe rather than a text field. Capturing allergies that are never checked is also a liability signal.
- **Expected**: ICD-10 (or SNOMED) validation against a bundled set; a warning when a prescribed drug conflicts with a recorded allergy or another active medication.
- **Suggested implementation**: Bundle a trimmed ICD-10 lookup and validate on write; add an interaction dataset (or licensed API) and surface non-blocking warnings in the prescribing UI, storing the acknowledgement.
- **Priority**: Medium
- **Phase**: Phase 4
- **TODOs**:
  - [ ] ICD code set + validation on `icdCodes`
  - [ ] Allergy conflict warning at prescription time
  - [ ] Drug–drug interaction source + warning UI
  - [ ] Store the clinician's acknowledgement of each warning
  - [ ] Dosage/unit sanity validation

---

## [MISS-REC-005] No whole-record export, no FHIR/ABDM data exchange
- **Description**: The only document export is the single-prescription PDF. There is no export of a patient's full record set (PDF/ZIP/JSON), no FHIR bundle, and the ABDM consent endpoints are stubs with no HIU/HIP data-transfer implementation behind them (REC-009, REC-012).
- **Why it matters**: Portability is both a patient right and the mechanism by which a patient moves between providers; without it the platform is a data silo, and no interoperability claim can be substantiated.
- **Expected**: A patient-triggered full export in a documented format, plus FHIR-conformant exchange for ABDM once consent is enforced.
- **Suggested implementation**: Build the export on top of the record-scope guard (one code path). Implement FHIR serialisation only after consent enforcement exists — exporting data through a consent model that is not enforced would multiply the existing problem.
- **Priority**: Medium
- **Phase**: Phase 4
- **TODOs**:
  - [ ] Patient-triggered export (PDF + machine-readable)
  - [ ] Document the format and include attachments
  - [ ] Rate-limit and audit the export
  - [ ] FHIR/ABDM exchange gated on enforced consent

---

## [MISS-REC-006] No dependent/family record model, and no emergency break-glass access
- **Description**: `Record.patientId` references `User` only, so a child or dependent without a login cannot own a record; there is no guardian relationship and no proxy-access delegation. Separately, there is no deliberate emergency-access path (a documented, audited override) even though `User.emergencyContact` exists — responders scanning a card get a minimal projection and nothing more.
- **Why it matters**: Paediatric and elder care are core hospital workflows, and an unmodelled dependent forces staff to create fake accounts or record against the wrong patient. Conversely, the absence of a legitimate break-glass path pushes emergency staff toward exactly the unscoped access that REC-001/REC-002 already permit.
- **Expected**: A dependent/proxy model with scoped guardian access, and an audited break-glass flow requiring a stated justification, time-boxed, with patient notification.
- **Suggested implementation**: Add a proxy/dependent link with explicit scope, or a `Dependent` model referenced by `patientId`. Implement break-glass as a consent type with `purpose: 'emergency'`, a short TTL, mandatory free-text justification and a patient notification.
- **Priority**: Medium
- **Phase**: Phase 4
- **TODOs**:
  - [ ] Dependent/proxy data model + scoped access
  - [ ] Guardian consent capture
  - [ ] Break-glass access with mandatory justification
  - [ ] Time-boxed emergency access + automatic patient notification
  - [ ] Emergency-access report for compliance review
  - [ ] Check whether `familyMembers` is already modelled on `User` and reconcile rather than duplicate

<!-- END -->
