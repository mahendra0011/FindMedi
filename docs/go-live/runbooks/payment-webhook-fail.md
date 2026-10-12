# Triage Runbook: Payment Webhook Failures

## Symptoms
- Alert: `PaymentWebhookFailure` fired.
- Multiple 400 Bad Request or 401 Unauthorized responses logged under `/api/webhooks/payments/*`.
- Patient OPD token or pharmacy invoice shows `Payment Pending` despite successful debit on patient's banking app.

## Investigation Steps
1. **Check Gateway Signature:**
   - Verify if gateway secrets (`RAZORPAY_KEY_SECRET`, `CASHFREE_SECRET_KEY`, `PAYU_MERCHANT_SALT`, `PHONEPE_SALT_KEY`) were recently rotated in Doppler/Vault without updating server environment.
2. **Replay Defense Log:**
   - Inspect backend logs for `webhook replay detected: timestamp outside allowed skew` or duplicate idempotency keys.
   - If network latency between payment gateway and server exceeds 300 seconds, check clock drift on host:
     ```bash
     w32tm /query /status   # Windows
     chronyc tracking       # Linux
     ```
3. **Manual Reconciliation:**
   - Run manual payout / transaction reconciliation job:
     ```bash
     cd backend
     node scripts/run-payout-reconcile.mjs --gateway=razorpay --reference=<tx_id>
     ```
4. **Billing Status Resolution:**
   - Once payment is confirmed on gateway portal, use Billing Desk "Reconcile Offline Payment" action with gateway reference number.
