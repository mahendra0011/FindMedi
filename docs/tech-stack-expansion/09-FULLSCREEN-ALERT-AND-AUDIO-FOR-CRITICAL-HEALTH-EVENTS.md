# 09 - Full-Screen Alerts & Web Audio Sirens Across Critical Clinical Events

## 1. Executive Summary
The high-urgency full-screen hardware-locking modal with programmatic audio synthesis developed for the dispatch system is equally vital across core hospital and clinic workflows.
Normal notifications in healthcare lead to **"Alarm Fatigue"** or missed clinical emergencies. This specification outlines where full-screen alerts must be enforced across clinical modules.

---

## 2. Core Clinical Full-Screen Alarm Scenarios

### A. Hospital "Code Blue" Cardiac Arrest Notification
- **Trigger**: Patient in Ward 4 enters ventricular fibrillation; bedside nurse presses wall button or IoT monitor detects asystole.
- **Alert UI**:
  - Full-screen flashing blue banner over all on-duty ICU and Resuscitation team tablets.
  - Web Audio generates distinct Code Blue resonant tone ($440\text{ Hz}$ continuous pulse).
  - Displays: Patient Room Number, Bed ID, Attending Physician, and Code Team arrival timer.

### B. Critical STAT Diagnostic Lab Panic Alerts
- **Clinical Situation**: Lab reports blood potassium of $7.2\text{ mEq/L}$ (lethal hyperkalemia risk) or Troponin-I of $15\text{ ng/mL}$ (acute myocardial infarction).
- **Alert UI**:
  - The ordering physician’s mobile dashboard is intercepted with a full-screen red warning modal.
  - The modal blocks all other dashboard actions until the physician confirms receipt and inputs an immediate clinical countermeasure order.

### C. Emergency Blood Requisition for Massive Transfusion Protocol (MTP)
- **Clinical Situation**: Emergency Room doctor initiates Massive Transfusion Protocol for severe trauma resuscitation.
- **Alert UI**:
  - Blood bank technician terminal locks into a full-screen amber alert with audio chime.
  - Direct 1-tap "Pack 4 Units O-Neg" release button initiates instant cooler dispatch.
