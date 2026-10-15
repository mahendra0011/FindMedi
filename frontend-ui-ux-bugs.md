# Frontend UI/UX — Bugs

## [FE-BUG-01] Sensitive AI Symptom History Stored in Plaintext Browser LocalStorage
- **Description**: In `frontend/src/pages/AiAssistant.tsx` or related AI components, symptom chat histories and user health queries are saved to `localStorage.getItem('findmedi_ai_history')` in unencrypted JSON.
- **Current vs Expected Behavior**:
  - *Current*: Detailed user health questions (e.g., "I have bloody stool and chest pain", "What is the dosage for escitalopram") persist in the browser's permanent localStorage.
  - *Expected*: AI symptom assistant history kept in session memory only, or encrypted with a temporary session key, clearing automatically when the tab is closed or user logs out.
- **Flow**: User asking FindMedi AI about symptoms, prescriptions, or mental health.
- **Root Cause / Logic**: Convenience persistence helper `localStorage.setItem('findmedi_ai_history', ...)` without health privacy considerations.
- **Affected Files**: `frontend/src/context/AiChatContext.tsx`, `frontend/src/pages/AiAssistant.tsx`
- **UI/Frontend Impact**: Family members or colleagues using the same computer can open DevTools or view previous health queries.
- **Security/Data Risk**: **High**. Privacy breach of sensitive medical symptoms on shared home or work PCs.
- **Steps to Reproduce**:
  1. Open FindMedi AI, ask a question about medication or symptoms.
  2. Open DevTools -> Application -> Local Storage.
  3. Inspect `findmedi_ai_history`; observe entire conversation stored in cleartext.
- **Suggested Fix / Implementation Plan**:
  1. Switch storage from `localStorage` to `sessionStorage` or in-memory React state.
  2. Add a clear "Wipe Chat History" button in the AI chat interface.
- **Priority**: High
- **Phase**: Phase 0
- **TODOs**:
  - [x] Remove `findmedi_ai_history` from localStorage.
  - [x] Add explicit chat history clear button.

---

## [FE-BUG-02] Missing Confirmation Dialogues on Destructive Hospital & Patient Actions
- **Description**: Several hospital and patient portal UI buttons trigger immediate destructive mutations (canceling a confirmed appointment, deleting a medical record, discharging an inpatient, revoking a staff credential) upon a single click without an accessible Radix Alert Dialog confirmation modal.
- **Current vs Expected Behavior**:
  - *Current*: Clicking "Cancel" or "Delete" immediately fires the HTTP DELETE/POST mutation. Accidental clicks on mobile screens immediately cancel surgeries or delete lab reports.
  - *Expected*: All destructive operations must render a `@radix-ui/react-alert-dialog` modal: "Are you sure you want to cancel this appointment? This action cannot be undone and will trigger an automated patient refund."
- **Flow**: OPD queue management, prescription cancellation, doctor schedule blocking.
- **Root Cause / Logic**: Direct `onClick={handleDelete}` without modal confirmation state wrapper.
- **Affected Files**: `frontend/src/pages/hospital/Appointments.tsx`, `frontend/src/pages/doctor/DoctorPrescriptions.tsx`, `frontend/src/pages/patient/Appointments.tsx`
- **UI/Frontend Impact**: Accidental loss of appointments and disrupted clinical queues.
- **Security/Data Risk**: **Medium**. Operational disruption and accidental data loss.
- **Steps to Reproduce**:
  1. Open Hospital Appointments list.
  2. Click "Cancel Booking" on any patient row.
  3. Action executes instantly without confirmation.
- **Suggested Fix / Implementation Plan**:
  1. Wrap all destructive buttons in `<AlertDialog>` component from `frontend/src/components/ui/alert-dialog.tsx`.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [x] Wrap appointment cancellation in AlertDialog.
  - [ ] Wrap record deletion in AlertDialog.

---

## [FE-BUG-03] Extensive `console.log` Statements in Production Frontend Bundle (240+ Occurrences)
- **Description**: Static scanning identified 245 instances of `console.log`, `console.warn`, and `console.error` across frontend pages and components, logging API responses, user objects, and internal state into browser DevTools.
- **Current vs Expected Behavior**:
  - *Current*: Vite build config does not drop console statements in production mode.
  - *Expected*: Vite build config must configure `esbuild.drop: ['console', 'debugger']` in production to prevent leaking internal state or API tokens to browser consoles.
- **Flow**: Entire user journey across all frontend pages.
- **Root Cause / Logic**: Vite configuration missing esbuild drop options.
- **Affected Files**: `frontend/vite.config.ts`, various component files across `frontend/src/`
- **UI/Frontend Impact**: None visually.
- **Security/Data Risk**: **Medium**. Information leakage in browser console if API response objects containing internal database properties are printed.
- **Steps to Reproduce**:
  1. Run `npm run build` in `frontend/`.
  2. Inspect generated dist chunks.
  3. Observe `console.log` statements retained in bundle.
- **Suggested Fix / Implementation Plan**:
  1. Add `esbuild: { drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [] }` to `frontend/vite.config.ts`.
- **Priority**: High
- **Phase**: Phase 0
- **TODOs**:
  - [x] Update `frontend/vite.config.ts` to drop console and debugger in production.
  - [x] Verify production bundle is clean of console calls.
