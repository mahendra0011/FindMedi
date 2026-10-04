# Deferred Production TODOs (code-complete, external dependency pending)

Ye 5 items code me fail-closed aur test-covered hain, par close karne ke liye
bahar ki cheez chahiye (isliye audit-md se `[x]` mark karke yahan track ho rahe hain).
Code base se audit md files hatane ke baad yehi ek source of truth hai.

## 1. Real payment provider adapter (PAY-B-07 / PAY-M-02)
- **Status:** Stub complete — `billing.js` production me `503 PAYMENT_PROVIDER_UNAVAILABLE`,
  webhook sirf ack (`webhook.js`), `applyWebhookSettlement` me `503 SETTLEMENT_NOT_IMPLEMENTED`
  contract + 7 tests pass (`webhookSettlementContract.spec.js`).
- **Baki:** Provider (Razorpay/Stripe) keys + intent/capture adapter + signed-webhook
  atomic settlement + sandbox replay tests.
- **Blocked on:** Provider account + API keys.

## 2. Deployed-client compatibility checks (PAY-B-05 / DL-B-06)
- **Status:** Role gates + masked DTOs + regression tests pass
  (`riderEarningsPrivacy.spec.js`).
- **Baki:** Live mobile/web clients ke against masked response verify karna
  (koi purana client raw field expect to nahi kar raha).
- **Blocked on:** Running staging/production clients.

## 3. Production Doctor legacy-data audit (ED-B-02 / ED-B-03 / RIDE-B-08)
- **Status:** Accept-path fallback hata diya, `assignedDoctorId` + `assignedDoctorUserId`
  mapping + tests pass.
- **Baki:** Production DB me `Doctor` rows jinka `user_id` invalid/missing hai, unka audit + cleanup.
- **Blocked on:** Production DB read access. Suggested: `Doctor.find({ user_id: null })`-jaisa
  audit script staging par chalana.

## 4. Native device attestation (RIDE-M-01)
- **Status:** Server-side plausibility gates live hain (accuracy > 250m reject,
  velocity > 180 km/h reject — `riders.js`, `socketService.js`) + tests pass.
- **Baki:** Play Integrity / SafetyNet / mock-location detection mobile app me.
- **Blocked on:** Mobile native implementation + real device testing.

## 5. Multi-store checkout UX (PHARMA-M-02)
- **Status:** Server jaan-boojh ke multi-store order par `422 MULTI_STORE_CHECKOUT_UNSUPPORTED`
  deta hai (koi malformed order nahi banta) + test covered.
- **Baki:** Aggregate checkout/payment reference + UX restore.
- **Blocked on:** Product decision (single-facility MVP lock hai).

## 6. Infra evidence pending real runs (INF-B-04 / INF-M-01 / DP-B-03)
- Restore-drill evidence archive + deploy provenance + Pinot table provision:
  scripts/config ready (`restore-drill.sh` step 7, `surge_sink_freshness.yaml`),
  par asli drill / deploy / Pinot cluster par run hona baki hai.
- **Blocked on:** Staging deploy + `backup-drill` run + Pinot cluster.

Related: see docs/qa-release.md for the release process.
