# Provider guide (draft)

## Joining FindMedi
1. Open /join and pick your provider type from the grouped chooser.
2. Complete the config-driven wizard: account, business, location, practitioners, services, documents, payout, availability, agreement, review.
3. Upload required documents (ClamAV-scanned, magic-byte checked). Drafts autosave; resume via email/SMS link.
4. Submit -> status `pending` -> admin review (SLA per type). Track at /join/applications/:id/status.

## Going live
- Approved providers land in `live`. Complete the activation checklist before first booking.
- Verified badge appears only after document verification.

## Managing your listing
- Update profile, services, availability, payouts via /provider/* routes.
- T3 providers (gym, yoga, store) cannot access patient medical data.

## Claims & advertising
- `adClaimsRestricted` categories require dual approval for any success-rate/cure claim.
- Sensitive categories (mental health, sexual health, IVF, palliative) use discreet mode.

## Support
- Tickets via /support; SLA per priority; escalation matrix in docs/ops.
