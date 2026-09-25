# 08 - Emergency SOS & Advanced Ambulance Dispatch Specification

## 1. Vertical Overview
The Emergency SOS module represents the highest criticality tier of FindMedi. It manages code-red life-threatening incidents: cardiac arrest, road traffic accidents, stroke, anaphylaxis, and severe hemorrhage.
Every second saved directly translates to lives saved. The target ambulance dispatch latency is **under 15 seconds**, with real-time green corridor routing via Valhalla.

---

## 2. Ambulance Classification Standards
1. **BLS (Basic Life Support)**: Oxygen delivery, stretcher, AED, and emergency paramedic.
2. **ALS (Advanced Life Support)**: Transport ventilator, multiparameter cardiac monitor, defibrillator, and critical care doctor/nurse.
3. **Neonatal / Pediatric ICU (NICU Ambulance)**: Specialized incubator and pediatric ventilator.
4. **Cardiac Care Ambulance**: Mobile 12-lead ECG, thrombolysis kit, and tele-cardiology link.

---

## 3. High-Priority Dispatch Flow

```
   [ PANIC CALLER / WITNESS ]                              [ AMBULANCE DRIVER & PARAMEDIC ]
            │                                                              │
 1. One-Tap Red Panic Button Pressed (or Voice SOS)                        │
 2. Device GPS Broadcasted (Accuracy < 5m)                                 │
 3. Triage Severity Form (3-second quick select: Cardiac/Trauma/Other)     │
            │                                                              │
            ▼ (HTTP POST /emergency-requests/dispatch)                     │
   [ High-Priority Matching Engine (H3 Res 6-7 Rapid Expansion) ]          │
            │                                                              │
            ├─────────────── Socket.IO Inbound ───────────────────────────►│
            │              'EMERGENCY_AMBULANCE_SIREN'                     │
            │                                                              │
            │                                                     4. Fullscreen Blood-Red Modal
            │                                                        Dual-Tone Emergency Siren
            │                                                        Vibration motor pulses
            │                                                        12s countdown timer
            │                                                        Patient age, chief complaint
            │                                                              │
            │◄─────────────── Socket.IO Outbound ──────────────────────────┤
            │                  'ACCEPT_EMERGENCY'                          │
            │                                                              │
 5. Dynamic Green Corridor Navigation (Valhalla Emergency Routing)         │
    - Avoids traffic chokepoints and construction zones                    │
    - Live ambulance location broadcast to destination Hospital ER         │
            │                                                              │
 6. Paramedic En Route:                                                    │
    - Pre-alerts receiving hospital trauma bay                             │
    - In-transit vitals streamed live to emergency room dashboard          │
            │                                                              │
 7. Arrival at Scene -> Patient Loaded -> Transit to Hospital ER           │
 8. Handover to Emergency Department -> Dispatch Completed                 │
```

---

## 4. Multi-Channel Redundancy (Zero-Drop Policy)
If an ambulance socket does not respond within 12 seconds:
1. **Parallel Ring**: The request does NOT wait; it simultaneously cascades to the next 3 closest ambulances across adjacent H3 cells.
2. **Hospital Fleet Integration**: Simultaneously notifies the central dispatch desk of the 2 nearest accredited hospitals.
3. **Email + In-App Fallback (SMS gateway removed — email-only policy)**: On full exhaustion the backend emails the caller (Brevo) and raises an in-app emergency notification directing them to call 108/112 directly.

---

## 5. Data Model: `EmergencyRequest.js`

```typescript
interface IEmergencyRequest {
  _id: ObjectId;
  userId?: ObjectId;
  callerPhone: string;
  patientName?: string;
  emergencyType: 'CARDIAC' | 'ROAD_ACCIDENT' | 'STROKE' | 'RESPIRATORY' | 'MATERNITY' | 'UNCONSCIOUS' | 'OTHER';
  severityLevel: 'CODE_RED' | 'CODE_YELLOW' | 'CODE_GREEN';
  pickupLocation: {
    address: string;
    coordinates: [number, number];
    h3_res6: string;
    accuracyMeters: number;
  };
  assignedAmbulanceId?: ObjectId;
  destinationHospitalId?: ObjectId;
  telemetryLogs: Array<{
    timestamp: Date;
    heartRate?: number;
    spo2?: number;
    bpSystolic?: number;
    bpDiastolic?: number;
  }>;
  status: 'BROADCASTING' | 'ACCEPTED' | 'EN_ROUTE_PICKUP' | 'PATIENT_PICKED_UP' | 'EN_ROUTE_HOSPITAL' | 'HANDOVER_COMPLETE' | 'CANCELLED';
  dispatchedAt: Date;
  hospitalHandoverAt?: Date;
}
```
