# 04 - Redis Distributed In-Memory State Across Healthcare Operations

## 1. Executive Summary
Redis provides sub-millisecond data access and distributed synchronization for non-location healthcare modules where race conditions could endanger patient safety or disrupt hospital operations.

---

## 2. Key Healthcare State Implementations

### A. Hospital ICU & Ventilator Bed Reservation Locks (Redlock)
- **Problem**: When a major accident occurs, multiple clinics or ambulances might simultaneously attempt to reserve the last remaining ICU bed or ventilator in a facility.
- **Redis Solution**:
  ```
  SET lock:hospital:bed:<hospitalId>:<bedId> <reservationId> NX PX 300000
  ```
  Grants an exclusive 5-minute holding lock while the ambulance is in transit, preventing double-admission race conditions.

### B. Blood Bank Rare Unit Reservation
- **Problem**: A surgeon requires 2 units of rare AB-Negative blood for an emergency surgery. Two different hospital requests arriving within seconds must not be promised the same physical blood bag.
- **Redis Solution**:
  - Atomic Redis decrement (`DECRBY blood:stock:<bankId>:AB_NEG 2`).
  - If stock $< 0$, immediately rolls back and alerts the surgical coordinator to initiate inter-bank transfer.

### C. Live Telemedicine Video Consultation Waiting Rooms
- **Problem**: Doctor and patient need real-time queue synchronization, WebRTC ICE candidate exchange, and turn timers.
- **Redis Solution**:
  - Redis Sorted Sets (`ZADD telemed:queue:<doctorId> <timestamp> <patientId>`) organize the patient lobby by exact arrival sequence.
  - Redis Pub/Sub coordinates WebRTC SDP offers and answer handshakes with sub-10ms latency.

### D. Prescription Abuse & Controlled Substance Rate Limiter
- **Problem**: Preventing "doctor shopping" where a patient attempts to book consultations with 5 different psychiatrists within 1 hour to stockpile Schedule X narcotic prescriptions.
- **Redis Solution**:
  - Redis sliding-window counter checks `narcotic:dispense:user:<aadhaar_hash>` across all affiliated clinics and pharmacies.
