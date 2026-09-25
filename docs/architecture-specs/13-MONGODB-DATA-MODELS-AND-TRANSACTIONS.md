# 13 - MongoDB Data Models, Indexing & ACID Transactions Specification

## 1. System of Record Overview
MongoDB serves as the authoritative, durable system of record for all business transactions, audit logs, provider credentials, and historical bookings.
All mutating operations involving state transitions or financial charges are executed within **MongoDB multi-document ACID transactions** over a Replica Set.

---

## 2. Master Model Architecture Across Instant Verticals

```
                             ┌────────────────────────┐
                             │       User.js          │
                             │  (Auth, KYC, Roles)    │
                             └───────────┬────────────┘
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
      ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
      │   RiderProfile.js   │ │  LawyerProfile.js   │ │ AssistantProfile.js │
      │  Vehicle, DL, RC    │ │ Bar Council Reg, Exp│ │ Nursing Council Reg │
      └──────────┬──────────┘ └──────────┬──────────┘ └──────────┬──────────┘
                 │                       │                       │
                 └───────────────────────┼───────────────────────┘
                                         │
                                         ▼
      ┌─────────────────────────────────────────────────────────────────────┐
      │                      BOOKINGS / DISPATCH DATA                       │
      │                                                                     │
      │  - RideBooking.js (Cabs, Autos, Bikes)                              │
      │  - LawyerBooking.js (Police station, bail, instant consult)         │
      │  - AssistantBooking.js (Home nurse, wound dressing, vitals)         │
      │  - EmergencyRequest.js (Ambulance SOS, triage, hospital handover)   │
      │  - EmergencyDoctorRequest.js (Instant video triage / home doctor)   │
      └──────────────────────────────────┬──────────────────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
      ┌─────────────────────┐                         ┌─────────────────────┐
      │     Payment.js      │                         │   OutboxEvent.js    │
      │ Razorpay / Escrow   │                         │ Kafka Event Outbox  │
      └─────────────────────┘                         └─────────────────────┘
```

---

## 3. Atomic Multi-Document Transaction Protocol

```typescript
// Sample Atomic Transaction Pattern for Dispatch Assignment
import mongoose from 'mongoose';

export async function assignProviderAtomically(bookingModel, bookingId, providerId, outboxEventData) {
  const session = await mongoose.startSession();
  session.startTransaction({
    readConcern: { level: 'snapshot' },
    writeConcern: { w: 'majority' }
  });

  try {
    // 1. Conditional update to verify booking is still unassigned
    const updatedBooking = await bookingModel.findOneAndUpdate(
      { _id: bookingId, status: 'SEARCHING_PROVIDER' },
      { 
        status: 'ASSIGNED', 
        assignedProviderId: providerId,
        assignedAt: new Date()
      },
      { session, new: true }
    );

    if (!updatedBooking) {
      throw new Error('CONCURRENCY_ERROR: Booking already assigned or cancelled.');
    }

    // 2. Insert corresponding event into Outbox collection within the same transaction
    await OutboxEvent.create([{
      aggregateType: outboxEventData.aggregateType,
      aggregateId: bookingId.toString(),
      eventType: 'dispatch.provider.assigned',
      payload: {
        bookingId: bookingId.toString(),
        providerId: providerId.toString(),
        assignedAt: new Date().toISOString()
      },
      destinationTopic: 'findmedi.dispatch.booking-events.v1',
      status: 'PENDING'
    }], { session });

    // Commit both writes atomically
    await session.commitTransaction();
    return updatedBooking;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}
```

---

## 4. Compound Indexing Strategy for High Performance

```javascript
// RideBooking Indexes
RideBookingSchema.index({ riderId: 1, createdAt: -1 });
RideBookingSchema.index({ driverId: 1, status: 1 });
RideBookingSchema.index({ status: 1, 'pickup.h3_res8': 1 });
RideBookingSchema.index({ 'pickup.coordinates': '2dsphere' }); // Geocoding fallback

// EmergencyRequest Indexes
EmergencyRequestSchema.index({ severityLevel: 1, status: 1 });
EmergencyRequestSchema.index({ dispatchedAt: -1 });
EmergencyRequestSchema.index({ 'pickupLocation.h3_res6': 1, status: 1 });

// Outbox Indexes
OutboxEventSchema.index({ status: 1, createdAt: 1 }); // Poller speed index
```
