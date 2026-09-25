# 22 - Platform Commission, Dynamic Platform Fees & Double-Entry Ledger Specification

## 1. Architectural Mandate
In a multi-vertical marketplace operating at scale, financial trust requires an immutable double-entry ledger. 
Whenever a ride, legal consultation, home nursing visit, or emergency service completes:
- Platform automatically calculates commission based on tier, zone, and vehicle/provider category (`CommissionConfig.js`).
- Platform splits customer fare into: Provider Earnings, Platform Commission, and TDS / Statutory Tax.
- Writes atomic debits and credits into `TransactionLedger.js`.

---

## 2. Dynamic Commission Engine (`CommissionConfig.js`)

```typescript
interface ICommissionConfig {
  vertical: 'rider' | 'lawyer' | 'assistant' | 'emergency_doctor' | 'ambulance';
  categoryTier: string; // e.g. "BIKE", "CAB_SEDAN", "SENIOR_ADVOCATE", "CRITICAL_NURSE"
  commissionType: 'PERCENTAGE' | 'FIXED' | 'HYBRID';
  percentageRate: number; // e.g. 15% for rides, 10% for legal consults
  fixedFee: number;       // e.g. ₹20 booking convenience fee
  gstRate: number;        // 18% GST on platform fee
  tdsDeductionRate: number; // 1% Section 194C / 194J TDS deduction
  effectiveFrom: Date;
}
```

---

## 3. Double-Entry Accounting Ledger (`TransactionLedger.js`)

Every financial movement writes balanced debits and credits. Money is never created or destroyed arbitrarily.

```
Example: Completed Cab Ride (Total Fare: ₹500)
1. DEBIT:  Customer Demo Wallet               ₹500.00
2. CREDIT: Escrow Clearing Account             ₹500.00

3. DEBIT:  Escrow Clearing Account             ₹500.00
4. CREDIT: Driver Virtual Payout Wallet        ₹420.00  (Earnings after commission)
5. CREDIT: FindMedi Revenue Account            ₹70.00   (14% Platform Fee)
6. CREDIT: Govt Tax Escrow (TDS & GST)         ₹10.00   (Statutory Deductions)
```

---

## 4. Instant Payout System (Demo Wallet & Bank IMPS/UPI Payouts)
- **Instant Driver Withdrawal**: Drivers and nurses can initiate instant withdrawal from their earnings balance to their bank account/UPI ID (`Payout.js`).
- **Minimum Reserve Threshold**: A minimum reserve (e.g. ₹100) is held in the driver account to cover potential penalty cancellations or cash ride commission arrears.
