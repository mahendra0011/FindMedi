# 28 — Remaining from Docs 01–15: Ops & Research

> **What this file is:** the two incomplete items that remain in the ops/research scope of `09-Missing-Pieces-and-Cross-Cutting.md` and `12-Wireframes-and-Screen-Flows.md` — after a codebase + test + Chrome re-verification (2026-11-15). Everything else in these docs is implemented and verified.
> **Source of truth for status:** the original docs (all restored) — their `[ ]` checkboxes are unchanged. See `00-Reference/FindMedi-Open-Items.md` for the complete items inventory across all docs.
> **Rule:** close an item only when its completion evidence is referenced in the source doc.

---

## O1 — Support & ops staffing + published SLA roster
- **Source:** `09-Missing-Pieces-and-Cross-Cutting.md:195` (`[ ]` line).
- **Current state (verified 2026-11-15):** SLA machinery is DONE — `slaDueAt` on tickets + `ticketEscalation.job.js` (hourly escalation), `dltTemplates`, `config/supportOperations.js`, `SupportTicket`/`Dispute` models, DSR routes live (`dsr.js`/`adminDsr.js`). What does NOT exist: the **human** part — hired/trained multilingual support team, published roster, named on-call + escalation contacts (incl. clinical advisor reachable), a reachability drill for safety/SOS escalation.
- **Close when:** roster published (owners, shifts, escalation tree), privacy/safety/crisis/refund/Rx training completed with records, advisor reachability test documented, roster committed with an update-date.

## O2 — Moderated usability study (Hindi/regional + low-end Android)
- **Source:** `12-Wireframes-and-Screen-Flows.md:361` (`[ ]` line); `DEFERRED_TODOS.md` #13; doc 14 usability step.
- **Current state (verified 2026-11-15):** every flow in doc 12's ASCII wireframes is implemented in code. **No usability sessions have been run** — no participants, no SUS scores, no findings log in the repo.
- **Close when:** 5–8 participants per persona (adult patient, elder/caregiver, parent of minor, fitness seeker, chronic patient), **5 provider interviews** (clinic owner, dentist, lab, pharmacy, gym/yoga), hi/regional language, low-end Android (2–3 GB) + throttled 3G; task scripts (search → book → pay, Rx order, join wizard provider-side, privacy centre, SOS); task success ≥90%, SUS ≥70; findings → backlog with decisions; usability sign-off recorded in the doc.

---

**Verification context (2026-11-15):** docs 01–15 were verified via codebase (all paths resolve, 0 broken refs), tests (450/450 doc-mapped backend suites, 447/447 frontend, telemedicine 5/5, data-dictionary fresh), and live Chrome checks (join-platform 103 types, search with live providers, facility/practitioner pages with real data, booking flow, legal pages, PWA surfaces). Role-gated dashboards/admin pages load but require credentials to click through — not part of this verification.
