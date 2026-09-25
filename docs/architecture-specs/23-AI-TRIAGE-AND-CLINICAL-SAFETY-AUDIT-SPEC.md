# 23 - AI Clinical Triage, Symptom Scoring & AI Safety Event Audit Specification

## 1. Architectural Mandate
FindMedi incorporates automated clinical symptom evaluation and AI assistance (`Triage.js`, `AiSafetyEvent.js`, `aiChat.js`).
Because algorithmic healthcare recommendations carry legal and life-safety implications:
- AI acts solely as an **advisory triage classifier**, never as an autonomous prescribing physician.
- Every symptom conversation is monitored in real-time by a safety guardrail.
- Any critical "red-flag" triggers an immutable `AiSafetyEvent` and escalates immediately to **Emergency SOS or Emergency Doctor**.

---

## 2. Real-Time Red-Flag Interception Protocol

```
┌────────────────────────────────────────────────────────┐
│             PATIENT INTERACTS WITH AI CHAT             │
│            "I feel heavy chest pain and nausea"        │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            AI SAFETY GUARDRAIL ENGINE                  │
│   Scans for Emergency Keywords:                        │
│   - Acute Chest Pain / Radiating Arm Pain (STEMI)      │
│   - Slurred Speech / Facial Droop (Stroke / FAST)      │
│   - Severe Dyspnea / Stridor (Respiratory Failure)     │
│   - Suicidal Ideation / Severe Self-Harm               │
└───────────────────────────┬────────────────────────────┘
                            │
              RED-FLAG DETECTED (Code Red)
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌───────────────────────┐       ┌───────────────────────┐
│ LOCK AI CONVERSATION  │       │ PERSIST SAFETY EVENT  │
│ Replace text box with │       │ Log to `AiSafetyEvent`│
│ [ CALL AMBULANCE NOW ]│       │ collection in MongoDB │
└───────────────────────┘       └───────────────────────┘
```

---

## 3. Data Schema: `AiSafetyEvent.js`

```typescript
interface IAiSafetyEvent {
  _id: ObjectId;
  userId: ObjectId;
  sessionId: string;
  threatLevel: 'INFO' | 'MODERATE' | 'CRITICAL_LIFE_THREAT';
  flaggedKeywords: string[];
  patientInputSnippet: string;
  recommendedEscalation: 'EMERGENCY_SOS' | 'EMERGENCY_DOCTOR' | 'SUICIDE_HELPLINE';
  userActionTaken: 'CLICKED_SOS' | 'IGNORED' | 'DISMISSED';
  timestamp: Date;
}
```

---

## 4. Triage Severity Index Scoring (`Triage.js`)
When a user submits an emergency request, the Emergency Severity Index (ESI) is computed:
- **ESI Level 1 (Resuscitation)**: Immediate life-saving intervention needed $\to$ Dispatches ALS Ambulance + Alerts Hospital ER.
- **ESI Level 2 (Emergent)**: High risk, confused, severe pain $\to$ Dispatches nearest BLS/ALS Ambulance.
- **ESI Level 3 (Urgent)**: Stable vitals but requires clinical evaluation $\to$ Dispatches Emergency Doctor.
- **ESI Level 4/5 (Non-urgent)**: Routed to standard outpatient clinic appointments.
