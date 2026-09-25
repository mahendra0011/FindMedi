# 07 - Medical Assistant Instant Care & Home Nurse Dispatch Specification

## 1. Vertical Overview
The Medical Assistant Instant Dispatch module enables immediate home healthcare assistance: certified registered nurses (RNs), bedside caregivers, emergency dressers, phlebotomists, and geriatric support assistants dispatched directly to a patient's doorstep.
For post-operative emergencies, acute wound care, insulin crises, or elderly fall assistance, families require rapid, verified medical caregivers within **15-30 minutes**.

---

## 2. Service Triage Classifications
1. **Critical Wound / Burn Dressing**: Sterile post-surgical dressing and minor burn care.
2. **IV Infusion / Injection Administration**: Certified nurse for chemotherapy line flush, antibiotic IV, or insulin delivery.
3. **Catheterization & Ryle's Tube Care**: Urinary catheter replacement or enteral feeding tube management.
4. **Acute Geriatric Bedside Support**: Immediate emergency assistance for immobilized or fallen elderly patients.
5. **Emergency Phlebotomy / Blood Draw**: Rapid STAT diagnostic blood/urine sample collection for urgent lab tests.

---

## 3. End-to-End Caregiver Dispatch Flow

```
   [ PATIENT / FAMILY MEMBER ]                          [ MEDICAL ASSISTANT / NURSE ]
            │                                                      │
 1. Tap [ BOOK EMERGENCY NURSE ]                                   │
 2. Select Care Type + Upload Prescription (Optional)              │
 3. Pre-Authorize Home Visit Fee                                   │
            │                                                      │
            ▼ (HTTP POST /assistant-bookings/dispatch)             │
   [ Matching Engine (H3 Res 7 Hexagonal Search) ]                 │
            │                                                      │
            ├─────────────── Socket.IO Inbound ───────────────────►│
            │               'ASSISTANT_DISPATCH_ALERT'             │
            │                                                      │
            │                                             4. Fullscreen Medical Alert
            │                                                Medical monitor beep audio
            │                                                45s countdown timer
            │                                                Care protocol & allergies
            │                                                      │
            │◄─────────────── Socket.IO Outbound ──────────────────┤
            │                'ACCEPT_ASSISTANT_CALL'               │
            │                                                      │
 5. Patient UI Updates:                                   6. Nurse UI Switches to:
    - Nurse Name, Licensure Badge, Photo                     - Patient Address & Directions (Valhalla)
    - Medical Kit Checklist                                  - Patient Allergy & Vitals Brief
    - Live Map Tracking (ETA in minutes)                     - [ ARRIVED AT RESIDENCE ] button
            │                                                      │
 7. Nurse Arrives -> Verifies Patient Identity                     │
 8. Care Administered -> Vitals logged into EHR chart              │
 9. Digital Nurse Charting signed off by patient/guardian          │
10. Escrow released to assistant wallet                            │
```

---

## 4. Nurse Credentialing & Patient Safety Protocols
- **Licensure Affirmation**: Only assistants with validated nursing council licenses, BLS/ACLS certifications, and police background clearance are permitted in the dispatch queue.
- **Medication Double-Check Rule**: The nurse mobile interface enforces a barcode/photo verification step before administering high-risk IV injections or narcotic analgesics.
- **Direct Tele-Physician Fallback**: If patient vitals deteriorate during home care, the assistant app contains a one-tap escalation button to connect immediately with an Emergency Doctor.

---

## 5. Data Model: `AssistantBooking.js`

```typescript
interface IAssistantBooking {
  _id: ObjectId;
  patientId: ObjectId;
  assistantId?: ObjectId;
  careType: 'WOUND_CARE' | 'IV_INFUSION' | 'CATHETER_CARE' | 'BEDSIDE_SUPPORT' | 'STAT_PHLEBOTOMY';
  patientConditionSummary: {
    age: number;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    allergies: string[];
    mobilityRestricted: boolean;
    prescribedDoctor?: string;
  };
  location: {
    homeAddress: string;
    apartmentNumber: string;
    coordinates: [number, number];
    h3_res7: string;
  };
  careChart: {
    vitalsPreCare?: { bp: string; pulse: number; spo2: number; temp: number };
    vitalsPostCare?: { bp: string; pulse: number; spo2: number; temp: number };
    clinicalNotes?: string;
    administeredMedications?: string[];
  };
  pricing: {
    baseVisitFee: number;
    consumablesFee: number;
    totalAmount: number;
  };
  status: 'DISPATCHING' | 'ACCEPTED' | 'EN_ROUTE' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED';
}
```
