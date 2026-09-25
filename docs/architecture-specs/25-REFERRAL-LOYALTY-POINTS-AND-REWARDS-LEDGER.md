# 25 - Referral Engine, Gamified Loyalty Points & Rewards Ledger Specification

## 1. Architectural Mandate
Customer acquisition and retention are driven by a gamified rewards system (`LoyaltyLedger.js`, `LoyaltyEarnRule.js`, `ReferralSettings.js`, `RewardCatalogItem.js`, `RewardRedemption.js`).
Riders, patients, and healthcare providers earn points for rides taken, blood donated, positive feedback logged, and friends referred.

---

## 2. Gamified Earning Rules (`LoyaltyEarnRule.js`)

| Activity / Action | Loyalty Points Earned | Tier Multiplier (Silver / Gold / Platinum) |
|---|---|---|
| **Completed Ride Booking** | 10 pts per ₹100 spent | $1.0\times$ (Silver), $1.25\times$ (Gold), $1.5\times$ (Platinum) |
| **Voluntary Blood Donation** | 500 bonus points | Universal Honor Badge |
| **Verified Doctor Consultation Review** | 50 points | One review per completed consult |
| **New Friend Referral** | 200 pts (Referrer) + ₹100 discount (Friend)| On friend's first completed ride/consult |

---

## 3. Rewards & Ledger Transaction Flow

```
                           ACTION TRIGGERED (e.g. Ride Done)
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │        LOYALTY ENGINE EVALUATOR       │
                      │  Matches against active rules in cache│
                      └───────────────────┬───────────────────┘
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │         `LoyaltyLedger.js`            │
                      │  Atomic entry: +50 Pts (CREDIT)       │
                      │  Expires in 365 Days                  │
                      └───────────────────┬───────────────────┘
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │       REWARD REDEMPTION CATALOG       │
                      │  - ₹100 Off Coupon Code               │
                      │  - Free Basic Diagnostic CBC Test     │
                      │  - 10% Off Pharmacy Order             │
                      └───────────────────────────────────────┘
```

---

## 4. Fraud Prevention & Abuse Prevention Guardrails
- **Self-Referral Ring Detection**: IP address matching, device fingerprinting, and IMEI tracking prevent users from creating synthetic burner accounts to farm referral bonuses.
- **Cooling-Off Period**: Referral credits remain in `PENDING` state until the referee completes their first trip and does not dispute or cancel the charge.
