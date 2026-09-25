# 06 - Lawyer Instant Legal Dispatch & Emergency Counsel Specification

## 1. Vertical Overview
The Lawyer Instant Dispatch module is designed for urgent, high-stakes legal situations: police detention, midnight FIR filings, accident bail, notary verifications, and instant legal triage.
Unlike typical legal directories that take 2-3 business days for appointments, FindMedi connects citizens to verified on-duty lawyers within **60 seconds** via real-time hexagonal matching.

---

## 2. Specialized Legal Triage Categories
1. **Police Station / Detention Emergency**: Immediate telephone or physical representation at the local police station for bail/detention.
2. **Accident & Traffic Dispute**: On-site representation for vehicular accidents, insurance liability, and traffic seizure.
3. **Domestic Violence & Protective Orders**: Urgent intervention for victims seeking immediate restraining orders.
4. **Commercial & Contractual Emergency**: Injunction filings, midnight contract sealing, and cheque bounce legal notices.
5. **Instant General Counsel**: 15-minute express audio/video legal triage.

---

## 3. End-to-End Dispatch Flow

```
   [ CITIZEN / CLIENT ]                                   [ ON-DUTY ADVOCATE ]
            │                                                      │
 1. Select Emergency Type (e.g. Police Detention)                  │
 2. Transmit Current Location + Incident Summary                   │
 3. Pre-Authorize Consultation Retainer (Razorpay Escrow)          │
            │                                                      │
            ▼ (HTTP POST /lawyer-bookings/instant)                 │
   [ Matching Engine (H3 Res 7 Zone Filtering) ]                   │
            │                                                      │
            ├─────────────── Socket.IO Inbound ───────────────────►│
            │                'LEGAL_DISPATCH_ALERT'                │
            │                                                      │
            │                                             4. Fullscreen Incoming Modal
            │                                                Court bell audio ringtone
            │                                                60s countdown timer
            │                                                Client charges & brief
            │                                                      │
            │◄─────────────── Socket.IO Outbound ──────────────────┤
            │                 'ACCEPT_LEGAL_CALL'                  │
            │                                                      │
 5. Secure Encrypted Channel Established:                 6. Lawyer Dashboard Opens:
    - WebRTC Direct Audio/Video Call                         - Case Evidence Viewer
    - End-to-End Encrypted Live Chat                         - Physical Police Station Nav
    - Auto-generated Vakalatnama Draft                       - Action Checklist (CrPC/BNS)
            │                                                      │
 7. If Physical Dispatch Selected:                                 │
    - Advocate navigates to police station / scene using Valhalla  │
    - Live tracking visible to client & family members             │
            │                                                      │
 8. Resolution Logged, Retainer Released from Escrow               │
```

---

## 4. Legal Compliance & Data Protection
- **Bar Council Verification**: Only advocates with verified State Bar Council enrollment numbers (`barCouncilRegNumber`) and active ID credentials are included in the H3 live dispatch pool.
- **Attorney-Client Privilege Protocol**: All instant chat attachments, recordings, and FIR documents uploaded to Cloudinary are AES-256 encrypted at rest and purged after 90 days unless tagged under active litigation.
- **Statutory Conflict-of-Interest Filter**: The matching engine cross-checks the opposing party's name (if entered) against the advocate's active client registry before dispatching the alert.

---

## 5. Data Schema & Models

### Model: `LawyerBooking.js` (Enhanced)
```typescript
interface ILawyerBooking {
  _id: ObjectId;
  clientId: ObjectId;
  lawyerId?: ObjectId;
  urgencyType: 'POLICE_STATION_VISIT' | 'ACCIDENT_DISPUTE' | 'INSTANT_CONSULT_CALL' | 'BAIL_PETITION';
  incidentDetails: {
    policeStationName?: string;
    firNumber?: string;
    description: string;
    attachmentUrls: string[];
  };
  clientLocation: {
    address: string;
    coordinates: [number, number];
    h3_res7: string;
  };
  pricing: {
    consultationFee: number;
    retainerAmount: number;
    escrowStatus: 'HELD' | 'RELEASED_TO_LAWYER' | 'REFUNDED_TO_CLIENT';
  };
  status: 'PENDING_MATCH' | 'LAWYER_ASSIGNED' | 'IN_CONSULTATION' | 'EN_ROUTE_POLICE_STATION' | 'RESOLVED' | 'CANCELLED';
  consultationRoomId?: string; // WebRTC / Jitsi room
}
```
