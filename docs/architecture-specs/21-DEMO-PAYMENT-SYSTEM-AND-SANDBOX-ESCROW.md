# 21 - Demo Payment System & Sandbox Escrow Specification

## 1. Executive Mandate
**No live payment gateway (Razorpay, Stripe, Paytm) is required or active at this stage.**
All financial flows across all 5 instant verticals (Rider, Lawyer, Assistant, Emergency SOS, Emergency Doctor) and healthcare services use the **FindMedi Demo Payment Engine**.

---

## 2. Core Architectural Principles of Demo Payment
1. **Zero External API Failure**: Never block a dispatch, booking, or ride because of external bank OTP timeouts, payment gateway downtime, or webhook signature mismatch.
2. **Deterministic Sandbox Simulation**:
   - Instant 1-click Demo Success.
   - Optional 1-click Demo Failure (for testing frontend error states).
   - Instant Demo Wallet Balance deduction.
3. **Mock Escrow Lifecycle**:
   - `DEMO_ESCROW_HELD`: Funds locked when booking/ride begins.
   - `DEMO_ESCROW_RELEASED`: Automatically credited to driver/lawyer/nurse demo wallet upon trip/consultation completion.
   - `DEMO_ESCROW_REFUNDED`: Automatically refunded if request is cancelled.

---

## 3. Demo Payment User Experience Flow (Frontend UI)

```
┌─────────────────────────────────────────────────────────────────┐
│                    💳 DEMO PAYMENT CHECKOUT                     │
│                  (FindMedi Sandbox Simulator)                   │
├─────────────────────────────────────────────────────────────────┤
│ Trip / Consultation ID: #BK-78921                               │
│ Service: On-Demand Cab Mini (Rider)                             │
│ Base Fare: ₹120.00                                              │
│ Distance (4.2 km): ₹84.00                                       │
│ Total Payable: ₹204.00                                          │
├─────────────────────────────────────────────────────────────────┤
│ Select Demo Payment Method:                                     │
│  ◉ [ FindMedi Demo Wallet ] (Current Demo Bal: ₹5,000)          │
│  ○ [ Mock UPI / QR Code ] (Simulated Instant Approval)          │
│  ○ [ Mock NetBanking / Card ] (Test 4111... Card)              │
│  ○ [ Cash on Delivery / Physical Handover ]                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────┐ ┌──────────────────────────┐ │
│  │   ⚡ SIMULATE SUCCESS (200)   │ │  ❌ SIMULATE FAIL (400)   │ │
│  │   (Instant Payment Approval)  │ │  (Test Decline Handling) │ │
│  └───────────────────────────────┘ └──────────────────────────┘ │
│                                                                 │
│ 🛡️ Sandbox Mode Active — No real currency is charged.          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Existing Backend Model: `DemoPayment.js`
Located at `backend/src/models/DemoPayment.js`:

```javascript
const DemoPaymentSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  vertical: {
    type: String,
    enum: ['rider', 'lawyer', 'assistant', 'emergency_sos', 'emergency_doctor', 'appointment', 'pharmacy'],
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  paymentMethod: {
    type: String,
    enum: ['DEMO_WALLET', 'MOCK_UPI', 'MOCK_CARD', 'CASH'],
    default: 'DEMO_WALLET'
  },
  status: {
    type: String,
    enum: ['PENDING', 'HELD_IN_ESCROW', 'SUCCESS', 'FAILED', 'REFUNDED'],
    default: 'PENDING'
  },
  mockTransactionId: {
    type: String,
    unique: true
  },
  completedAt: Date
}, { timestamps: true });
```

---

## 5. API Endpoints Architecture (`/api/v1/demo-payments`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/demo-payments/create` | Initializes demo transaction and locks demo escrow |
| `POST` | `/api/v1/demo-payments/confirm` | Simulates instant success, marks booking `PAID`, releases escrow |
| `POST` | `/api/v1/demo-payments/fail` | Simulates payment failure, tests retry dialog |
| `POST` | `/api/v1/demo-payments/refund` | Instant demo refund upon trip cancellation |
| `GET`  | `/api/v1/demo-payments/wallet/:userId` | Returns virtual sandbox wallet balance (default ₹10,000) |

---

## 6. Golden Rules for Developers
1. **Never import Razorpay SDK in booking controllers**: Keep all booking and dispatch modules bound to `DemoPaymentService`.
2. **Emit Kafka & Socket Events Normally**: The demo payment system must emit `payment.completed` events to Kafka so downstream analytics (Pinot, Flink, OpenSearch) function identically to production.
3. **Switchable Provider Pattern**: Design payment logic with a clean `IPaymentProvider` interface so swapping `DemoPaymentProvider` with a real gateway in the future requires modifying only 1 environment flag (`PAYMENT_PROVIDER=demo`).
