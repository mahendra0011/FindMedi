# Loyalty & Rewards — Missing Features & Capabilities

## [LOYALTY-MISSING-01] Point Expiry Schedule & Grace Period Notification Engine
- **Description**: Currently, loyalty points accumulated in `User.loyaltyPoints` have no expiry date or ledger-tracked vintage buckets. Points remain valid forever without forfeiture, preventing financial liabilities from closing on hospital books.
- **Current vs Expected Behavior**:
  - *Current*: Points balance is a single scalar integer on `User.loyaltyPoints`.
  - *Expected*: Ledger-backed points model (`LoyaltyLedger.js`) with:
    1. 12-month expiry timestamp per earned batch.
    2. Automated FIFO (First In, First Out) point deduction on redemption.
    3. Automated 30-day and 7-day points expiry warning notifications via WhatsApp/SMS to drive booking re-engagement.
- **Flow**: Patient viewing rewards page; end-of-year financial liability closure.
- **Root Cause / Logic**: Initial MVP loyalty was built as a single counter rather than an expiring ledger.
- **Affected Files**: `backend/src/models/User.js`, `backend/src/services/loyaltyService.js`, `backend/src/routes/loyalty.js`
- **UI/Frontend Impact**: Rewards dashboard displays "250 points expiring on 31 Dec 2026" with countdown.
- **Security/Data Risk**: **Low**. Unbounded balance-sheet liability for platform merchant accounts.
- **Suggested Fix / Implementation Plan**:
  1. Create `LoyaltyTransaction.js` model with `expiresAt`.
  2. Implement nightly expiry cron job marking lapsed points as `EXPIRED`.
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Implement `LoyaltyTransaction.js` vintage tracking.
  - [ ] Add nightly points expiry worker.

---

## [LOYALTY-MISSING-02] Tiered Health Rewards Status (Bronze, Silver, Gold, Platinum)
- **Description**: To drive chronic disease care adherence (regular monthly medicine refills, quarterly HbA1c diabetic tests, annual executive checkups), FindMedi lacks a gamified tiered status engine with tier-specific perks (e.g. priority ambulance dispatch, waived medicine delivery fees, free annual eye checkup).
- **Current vs Expected Behavior**:
  - *Current*: All patients have the same flat rewards rate (₹1 = 1 point).
  - *Expected*: Dynamic tier calculation based on 12-month health engagement:
    - Bronze (entry level: 1x points)
    - Silver (3+ consultations/year: 1.25x points + free tele-consult)
    - Gold (chronic care care plan subscriber: 1.5x points + waived lab home collection)
    - Platinum (family care health bundle holder: 2x points + dedicated health concierge)
- **Flow**: Patient loyalty dashboard and checkout discount calculation.
- **Root Cause / Logic**: Platform gamification roadmap was deferred during clinical module rollout.
- **Affected Files**: `backend/src/services/loyaltyService.js`, `frontend/src/pages/patient/Rewards.tsx`
- **UI/Frontend Impact**: Metallic gradient tier badge (Silver/Gold/Platinum) and progress bar showing "₹850 spent away from Gold tier".
- **Security/Data Risk**: **Low**. Marketing and user retention enhancement.
- **Suggested Fix / Implementation Plan**:
  1. Add `tier: { type: String, enum: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'], default: 'BRONZE' }` in `User.js`.
  2. Implement tier evaluation logic in `loyaltyService.js`.
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add tier evaluation in `loyaltyService.js`.
  - [ ] Update frontend Rewards page with tier progression bar.
