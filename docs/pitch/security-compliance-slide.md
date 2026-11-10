# Security & compliance status slide (draft)

## Accurate status (as of 2026-11)
- Authz manifest: 1897 routes classified, 0 unclassified.
- Platform roles hold NO default PHI access; break-glass requires approved grant + DPO review.
- Field encryption: bank account/IFSC, practitioner reg numbers, tax fields.
- ClamAV scan: production default required, fail-closed.
- ZAP baseline in CI (staging); no recorded pentest yet (timeline: Q1 next year).
- DPIA + retention policy documented; DSR self-serve live.
- Audit log hash-chained; phi_access events immutable.

## Pentest timeline
- External pentest: planned Q1 (after staging parity). Not yet executed.
