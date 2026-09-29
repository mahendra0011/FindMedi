# Authorization / RBAC — Missing Features

Scope: capabilities absent from the authorisation layer (`middleware/auth.js`, `User.role`, route registrations).
Companion file: `authorization-rbac-bugs.md` (3 findings, including the systemic `AUTHZ-001`).

---

## [MISS-AUTHZ-001] No permission model — only coarse role names
- **Description**: Authorisation is expressed exclusively as a role list (`User.role`, 25+ values) with no resource/action permissions, no scopes and no record-level rules. There is no way to express "can refund an order under ₹5,000", "can view PHI but not export it", or "read-only auditor". Every policy change is a code change and a deploy.
- **Why it matters**: With no permission vocabulary, the only alternatives are over-permissive (`adminOnly`) or bespoke inline checks — which is precisely how a 41%-unguarded route surface came about.
- **Expected**: Permission strings (`payments:refund`, `records:read`, `records:export`) attached to roles and checked by one `authorize()` middleware; the role→permission mapping in config, not code.
- **Suggested implementation**: Introduce `permissions[]` on `User` (defaulted from role), an `authorize(permission)` middleware, and a documented matrix. Migrate routes incrementally, starting with the highest-risk writes.
- **Priority**: High
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Define the permission catalogue (`resource:action`)
  - [ ] Role → permission defaults + per-user overrides
  - [ ] `authorize(permission)` middleware
  - [ ] Migrate routes incrementally, highest-risk writes first
  - [ ] Permission matrix published in docs

---

## [MISS-AUTHZ-002] No route inventory, no authorisation coverage check in CI
- **Description**: There is no generated list of endpoints with their required roles, and nothing that fails a build when a route is registered without authorisation middleware. `AUTHZ-001`'s 324 unguarded endpoints were found by an ad-hoc script, not by the project.
- **Why it matters**: Without an automated check the count can only go up. Every new endpoint is a new opportunity for the same class of defect, and manual review has already proven insufficient at this scale (790 endpoints).
- **Expected**: A CI job that enumerates `router.<verb>(` registrations, asserts each has `protect` plus an authorisation guard (or an explicit public annotation), and publishes the route→role inventory as a build artefact.
- **Suggested implementation**: A small Node script parsing the route files (or mounting the Express app and introspecting the router stack) run in CI; fail on any unannotated route. Commit the generated matrix to docs so drift is reviewable.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Route-enumeration script + CI job
  - [ ] Convention for explicitly-public routes
  - [ ] Generated authorisation matrix as a build artefact
  - [ ] Baseline the current 40 files in an allowlist that can only shrink

---

## [MISS-AUTHZ-003] No maker–checker approval for destructive or high-value actions
- **Description**: There is no two-person rule anywhere: refunds, invoice cancellations, record deletions, role changes and payouts are single-request actions. No step-up re-authentication (password or OTP) is required for destructive operations, and there is no approval queue.
- **Why it matters**: Insider fraud and accidental destruction are the dominant residual risks once external access is controlled, and this platform handles both money and irreversible clinical records.
- **Expected**: An approval workflow (request → second approver → execute, both audited) for refunds above a threshold, deletions, payouts and role escalation, plus step-up auth for the same actions.
- **Suggested implementation**: An `ApprovalRequest` model with `{ action, payload, requestedBy, approvedBy, status }` and a generic middleware that consumes approved requests; step-up auth via the existing OTP service, with a short-lived elevation flag on the session.
- **Priority**: Medium
- **Phase**: Phase 3
- **TODOs**:
  - [ ] `ApprovalRequest` model + workflow
  - [ ] Threshold configuration per action type
  - [ ] Step-up authentication for destructive actions
  - [ ] Approval UI for admins
  - [ ] Both approvers recorded in the audit log

<!-- END -->
