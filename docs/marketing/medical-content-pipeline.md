# Medical content pipeline (draft)

## Roles
- Author: medical writer / clinician.
- Reviewer: clinical advisor (NMC-registered).
- Editor: content lead.
- Publisher: after review approval.

## Process
1. Topic selection (specialty gaps, search demand).
2. Draft (plain language, evidence-based).
3. Clinical review (accuracy, safety).
4. Legal review (claims, disclaimers).
5. Publish (status: published, reviewedBy, reviewedAt).
6. Update cycle: quarterly review + on new evidence.

## Controls
- `PlatformContent` status workflow: draft -> in_review -> published.
- Only published + reviewed articles shown in specialty Articles tab.
- `adClaimsRestricted` categories require extra review.
