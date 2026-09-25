# 03 - Real-Time Matching Engine Specification

## 1. Engine Objective
The FindMedi Real-Time Matching Engine is responsible for assigning requests to eligible providers with minimal wait times, zero concurrent double-booking, and resilient failover. It orchestrates all 5 verticals (Rider, Lawyer, Assistant, SOS Ambulance, Emergency Doctor).

---

## 2. Distributed Locking & Concurrency Model (Redlock Pattern)

### The Double-Booking Hazard
In high-concurrency environments, two nearby riders might simultaneously select the same isolated driver, or two emergency requests might attempt to grab the same ambulance.

### Redlock Protocol
When an offer is accepted by a provider:
1. Provider emits `DISPATCH_ACCEPT` event with `idempotencyKey` and `bookingId`.
2. Backend attempts to acquire distributed lock in Redis:
   ```
   SET lock:provider:<providerId> <bookingId> NX PX 10000
   ```
3. If lock fails:
   - Return rejection response: `PROVIDER_ALREADY_ENGAGED`.
   - Re-route booking to next candidate in queue.
4. If lock succeeds:
   - Execute conditional MongoDB atomic update:
     ```javascript
     Booking.findOneAndUpdate(
       { _id: bookingId, status: "SEARCHING_PROVIDER" },
       { status: "PROVIDER_ASSIGNED", assignedProviderId: providerId, acceptedAt: new Date() },
       { new: true }
     );
     ```
   - Release lock once booking transaction commits.

---

## 3. The 3-Tier Cascading Ring Dispatch Algorithm

```
                             [ NEW BOOKING CREATED ]
                                        │
                                        ▼
                             Resolve H3 Cell (Origin)
                                        │
                                        ▼
                      ┌────────────────────────────────────┐
                      │    TIER 1 DISPATCH (k-Ring 0 - 1)  │
                      │  Candidates ranked by Valhalla ETA │
                      └─────────────────┬──────────────────┘
                                        │
                      Send Fullscreen Ring to Candidate #1
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             ▼                                                     ▼
     Candidate Accepts                                     Timeout / Reject (15-30s)
             │                                                     │
    [ ASSIGN & NAVIGATE ]                        Send Fullscreen Ring to Candidate #2
                                                                   │
                                                 ┌─────────────────┴─────────────────┐
                                                 ▼                                   ▼
                                         Candidate Accepts                   All Tier 1 Exhausted
                                                 │                                   │
                                        [ ASSIGN & NAVIGATE ]                        ▼
                                                                   ┌────────────────────────────────────┐
                                                                   │    TIER 2 DISPATCH (k-Ring 2 - 3)  │
                                                                   │  Broader radius, Valhalla rerank   │
                                                                   └─────────────────┬──────────────────┘
                                                                                     │
                                                                           Send Offer to Candidates
                                                                                     │
                                                                         ┌───────────┴───────────┐
                                                                         ▼                       ▼
                                                                      Accept               All Exhausted
                                                                         │                       │
                                                                [ ASSIGN & NAVIGATE ]            ▼
                                                                                   ┌──────────────────────────┐
                                                                                   │   BROADCAST SURGE MODE   │
                                                                                   │  Notify all in city zone │
                                                                                   │  Or elevate to SOS Queue │
                                                                                   └──────────────────────────┘
```

---

## 4. Multi-Vertical Matching Configuration Parameters

```json
{
  "verticals": {
    "rider": {
      "initialH3Res": 8,
      "maxKRing": 2,
      "candidateTimeoutSeconds": 15,
      "dispatchType": "SERIAL_WATERFALL",
      "valhallaCosting": "auto",
      "maxBatchSize": 10
    },
    "lawyer": {
      "initialH3Res": 7,
      "maxKRing": 3,
      "candidateTimeoutSeconds": 60,
      "dispatchType": "PARALLEL_OFFER_FIRST_ACCEPT",
      "valhallaCosting": "auto",
      "maxBatchSize": 5
    },
    "assistant": {
      "initialH3Res": 7,
      "maxKRing": 2,
      "candidateTimeoutSeconds": 45,
      "dispatchType": "SERIAL_WATERFALL",
      "valhallaCosting": "auto",
      "maxBatchSize": 8
    },
    "emergency_sos": {
      "initialH3Res": 6,
      "maxKRing": 4,
      "candidateTimeoutSeconds": 12,
      "dispatchType": "PARALLEL_MULTI_RING",
      "valhallaCosting": "emergency",
      "maxBatchSize": 20
    },
    "emergency_doctor": {
      "initialH3Res": 7,
      "maxKRing": 3,
      "candidateTimeoutSeconds": 25,
      "dispatchType": "SERIAL_WATERFALL_THEN_BURST",
      "valhallaCosting": "auto",
      "maxBatchSize": 12
    }
  }
}
```

---

## 5. Failure Handling and Fallback Cascades
1. **Zero Available Providers**:
   - Immediately schedule retry job in Redis (backoff: 5s, 10s, 15s).
   - Expand H3 radius by $+1$ ring.
   - If emergency vertical (SOS/Doctor), ping affiliated hospital trauma desks directly via Webhook/SMS.
2. **Provider Stale GPS / Drift**:
   - Disqualify any candidate whose `lastSeen` exceeds 60 seconds.
   - Prompt provider client to re-verify location permissions.
3. **Network Glitch During Dispatch**:
   - Client socket acknowledges packet receipt (`packet_ack`).
   - If ack is not received within 2 seconds, server assumes socket severed, marks provider uncontactable, and immediately advances to next candidate.
