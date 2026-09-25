# 09 - Emergency Doctor On-Call & Instant Tele-Triage Specification

## 1. Vertical Overview
The Emergency Doctor On-Call module bridges the critical gap between symptom onset and hospital arrival. It pairs distressed patients or caregivers with certified emergency physicians (MBBS/MD Emergency Medicine) within **30 seconds** via instant video triage or rapid home dispatch.

---

## 2. Dual Modes of Emergency Doctoring
1. **Mode A: Instant High-Priority Video Tele-Triage (Under 30s)**:
   - For acute symptoms: pediatric seizure, high fever delirium, chest discomfort assessment, toxic ingestion, or burn triage.
   - High-definition low-latency WebRTC video link with digital prescription generation.
2. **Mode B: Emergency Home Visit Physician Dispatch (Under 20m)**:
   - For homebound palliative patients, acute fractures, or non-ambulatory elderly patients requiring physical clinical evaluation and emergency medications.

---

## 3. End-to-End Physician Dispatch Flow

```
   [ DISTRESSED PATIENT / GUARDIAN ]                             [ ON-CALL EMERGENCY DOCTOR ]
                  │                                                           │
 1. Select Emergency Category (e.g. Pediatric Convulsion)                     │
 2. Transmit Patient Age, Gender, Known Conditions                            │
 3. Choose: [ INSTANT VIDEO ] or [ HOME VISIT PHYSICIAN ]                     │
                  │                                                           │
                  ▼ (HTTP POST /emergency-doctors/request)                    │
   [ Matching Engine (H3 Res 7 Filtering) ]                                   │
                  │                                                           │
                  ├──────────────── Socket.IO Inbound ───────────────────────►│
                  │               'DOCTOR_EMERGENCY_SIREN'                    │
                  │                                                           │
                  │                                                  4. Fullscreen Emergency Alert
                  │                                                     Urgent medical alarm tone
                  │                                                     25s countdown timer
                  │                                                     Triage summary & vitals brief
                  │                                                           │
                  │◄─────────────── Socket.IO Outbound ───────────────────────┤
                  │                   'ACCEPT_DOCTOR_CALL'                    │
                  │                                                           │
 5. If Video Mode:                                                   6. If Home Visit Mode:
    - WebRTC Direct Encrypted Video Room Opens                         - Valhalla Turn-by-Turn Route Opens
    - Doctor initiates CPR/First-Aid guidance                          - Physician Medical Bag Checklist
    - Real-time digital Rx signing (MCI certified)                     - Live tracking visible to family
                  │                                                           │
 7. Direct Ambulance Escalation Button:                                       │
    - If doctor determines condition is critical (e.g. STEMI Heart Attack),   │
      doctor can press [ ESCALATE TO ALS AMBULANCE ] directly from call screen│
```

---

## 4. Statutory Licensure & Emergency Duty Affirmation
Every doctor entering the on-call pool must complete an active shift affirmation modal (`DoctorIncomingEmergencyModal` & Licensure Affirmation) confirming:
- Active State Medical Council / NMC registration.
- Compliance with National Telemedicine Practice Guidelines.
- Immediate availability without distracting clinical duties during the active shift.

---

## 5. Data Model: `EmergencyDoctorRequest.js`

```typescript
interface IEmergencyDoctorRequest {
  _id: ObjectId;
  patientId: ObjectId;
  doctorId?: ObjectId;
  consultationMode: 'VIDEO_TRIAGE' | 'HOME_VISIT';
  triageDetails: {
    chiefComplaint: string;
    durationMinutes: number;
    severityScore: 1 | 2 | 3 | 4 | 5; // 1 = Critical, 5 = Mild
    suspectedCondition?: string;
  };
  location: {
    address: string;
    coordinates: [number, number];
    h3_res7: string;
  };
  webrtcRoom?: {
    sessionId: string;
    token: string;
    startedAt?: Date;
    endedAt?: Date;
  };
  prescriptionGenerated?: {
    prescriptionId: ObjectId;
    digitalSignatureHash: string;
  };
  status: 'SEARCHING_DOCTOR' | 'ACCEPTED' | 'IN_CONSULTATION' | 'EN_ROUTE_HOME' | 'COMPLETED' | 'ESCALATED_TO_AMBULANCE' | 'CANCELLED';
  fee: {
    amount: number;
    paymentStatus: 'PAID' | 'ESCROW_HELD' | 'REFUNDED';
  };
}
```
