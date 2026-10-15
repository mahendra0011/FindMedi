# Loyalty & Rewards — Bugs

## [LOYALTY-BUG-01] Missing Concurrency Lock on Loyalty Points Debit (Double-Spend Risk)
- **Description**: In `backend/src/services/loyaltyService.js` and `backend/src/routes/loyalty.js`, redeeming loyalty points (e.g. applying ₹200 loyalty discount on an appointment or medicine order) checks point balance and then decrements without an atomic conditional write (`$inc` with `$gte` guard) or Mongoose transaction.
- **Current vs Expected Behavior**:
  - *Current*: `if (user.loyaltyPoints >= requested) { user.loyaltyPoints -= requested; await user.save(); }`.
  - *Expected*: Atomic MongoDB operation `User.findOneAndUpdate({ _id: userId, loyaltyPoints: { $gte: requested } }, { $inc: { loyaltyPoints: -requested } }, { new: true })`.
- **Flow**: Patient redeeming reward points at checkout on two tabs simultaneously.
- **Root Cause / Logic**: Non-atomic read-then-write pattern on loyalty balance.
- **Affected Files**: `backend/src/services/loyaltyService.js`, `backend/src/routes/loyalty.js`
- **UI/Frontend Impact**: Points balance in header can show negative numbers or duplicate discounts.
- **Security/Data Risk**: **High**. Financial double-spending vulnerability. Users can exploit concurrent checkout requests to apply the same 1,000 loyalty points to multiple orders simultaneously.
- **Steps to Reproduce**:
  1. Open two browser tabs with a cart totaling ₹500, having 500 points (₹250 value).
  2. Click "Redeem Points & Checkout" on both tabs at the exact same millisecond.
  3. Both orders receive ₹250 discount, spending 1,000 points while holding only 500.
- **Suggested Fix / Implementation Plan**:
  1. Refactor `redeemPoints` in `loyaltyService.js` to use atomic `$inc` with `{ loyaltyPoints: { $gte: points } }`.
  2. Reject second call with 409 Conflict if points are insufficient.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [x] Update `loyaltyService.js` to use atomic `$inc` with condition.
  - [x] Add unit test checking concurrent redemption collision.

---

## [LOYALTY-BUG-02] Referral Bonus Self-Referral Sybil Attack Loop
- **Description**: In `backend/src/services/referralService.js`, referral credit is credited upon new user signup when a `referralCode` is provided, without device fingerprint validation, payment method uniqueness, or first-order completion requirement.
- **Current vs Expected Behavior**:
  - *Current*: An existing user can script signup of 50 disposable phone numbers or email addresses using their own referral code and instantly receive ₹150 wallet credit per signup.
  - *Expected*: Referral credits must only be disbursed after the referred user completes their first paid clinical consult or pharmacy delivery (> ₹200). Self-referrals sharing the same IP, device ID, or payment card must be blocked.
- **Flow**: User referring family or friends to earn booking credits.
- **Root Cause / Logic**: Unconditional signup reward without qualification event gating.
- **Affected Files**: `backend/src/services/referralService.js:35-80`, `backend/src/routes/auth.js`
- **UI/Frontend Impact**: Fraudulent wallet balances created.
- **Security/Data Risk**: **High**. Promo budget exhaustion and financial abuse.
- **Steps to Reproduce**:
  1. Obtain user referral code `REF-USER1`.
  2. Script 10 signups using burner numbers referencing `REF-USER1`.
  3. `REF-USER1` receives ₹1,500 in booking credits without any referred user spending money.
- **Suggested Fix / Implementation Plan**:
  1. Mark referral rewards as `PENDING` until referred user completes first paid service.
  2. Check for matching IP/device fingerprint.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [x] Add `first_order_completed` gating in `referralService.js`.
  - [x] Add abuse velocity limit per referral code.
