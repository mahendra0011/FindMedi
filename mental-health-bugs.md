# Mental Health — Bugs

## [MH-BUG-01] Sensitive Mental Health Screening Scores Logged into General Audit Stream
- **Description**: In `backend/src/services/mentalHealthScreening.js`, PHQ-9 (depression) and GAD-7 (anxiety) questionnaire responses and severity scores are passed into general audit logs without pseudonymization or redaction.
- **Current vs Expected Behavior**:
  - *Current*: `auditLog('screening_completed', userId, { score: 18, severity: 'Severe', answers })` writes patient's suicidal ideation response (PHQ-9 Question 9) to standard OpenSearch and MongoDB audit log collections.
  - *Expected*: Mental Health Care Act 2017 (MHCA Section 23) strictly mandates absolute confidentiality of mental health records. Audit logs must record only `{ event: 'screening_completed', category: 'mental_health' }` without raw questions, answers, or severity scores.
- **Flow**: Patient completing an online self-assessment for depression or anxiety.
- **Root Cause / Logic**: General audit helper was called with raw payload object.
- **Affected Files**: `backend/src/services/mentalHealthScreening.js:80-110`, `backend/src/routes/mentalHealth.js`
- **UI/Frontend Impact**: None directly.
- **Security/Data Risk**: **Critical**. Severe privacy violation and legal liability under Mental Healthcare Act 2017. Internal support or administrative staff with audit log access can view patients' private suicidal thoughts and psychiatric scores.
- **Steps to Reproduce**:
  1. Complete a PHQ-9 screening assessment.
  2. Query `AuditLog.find({ action: 'screening_completed' })`.
  3. Observe patient's answers and depression severity in plaintext metadata.
- **Suggested Fix / Implementation Plan**:
  1. Redact all questionnaire answers and clinical scores before calling `auditLog`.
  2. Enforce field encryption on `MentalHealthRecord` model.
- **Priority**: High
- **Phase**: Phase 0
- **TODOs**:
  - [x] Strip answers and scores from audit log payload in `mentalHealthScreening.js`.
  - [x] Add unit test checking audit log sanitization for mental health events.

---

## [MH-BUG-02] Missing Emergency Crisis Interception on Severe Suicidal Response (PHQ-9 Q9)
- **Description**: When a user selects a positive score on Question 9 of PHQ-9 ("Thoughts that you would be better off dead, or of hurting yourself"), the backend records the score but does not trigger an immediate crisis intervention event or surface the National Tele-MANAS (14416) / Kiran helpline to the user.
- **Current vs Expected Behavior**:
  - *Current*: Returns standard JSON response with total score and recommendation to book a therapist.
  - *Expected*: Any score > 0 on Question 9 must immediately trigger a crisis state:
    1. Returns high-priority emergency payload with prominent 24x7 toll-free Tele-MANAS (14416) and Vandrevala Foundation helplines.
    2. Sends an automated non-punitive welfare notification to the patient's registered trusted contact if consented.
- **Flow**: Patient filling mental health screening questionnaire.
- **Root Cause / Logic**: Scoring engine treated all 9 questions as a simple arithmetic sum without an emergency alert rule for Question 9.
- **Affected Files**: `backend/src/services/mentalHealthScreening.js:45-75`, `backend/src/lib/clinicalScores.js`
- **UI/Frontend Impact**: Crisis banner with direct one-tap call to National Tele-MANAS helpline 14416.
- **Security/Data Risk**: **High**. Life-safety / patient mortality hazard.
- **Steps to Reproduce**:
  1. Submit PHQ-9 answers with `q9: 3` (nearly every day).
  2. Observe standard booking recommendation returned without crisis hotline.
- **Suggested Fix / Implementation Plan**:
  1. Add red-flag check on `answers.q9 > 0`.
  2. Return `{ crisis: true, helplines: [...] }` in screening response.
- **Priority**: High
- **Phase**: Phase 0
- **TODOs**:
  - [x] Implement Question 9 crisis check in `mentalHealthScreening.js`.
  - [x] Add Tele-MANAS helpline payload to crisis response.
