# Frontend UI/UX — Missing Features & Capabilities

## [FE-MISSING-01] Idle Session Auto-Logout & Screen Lock for Shared Clinic Terminals
- **Description**: Hospital nurses, ward receptionists, and outpatient doctors routinely leave shared clinic computer terminals unattended when called for rounds or patient emergencies. FindMedi frontend lacks an automated idle timer (e.g. 10–15 minutes of inactivity) that blurs the screen and requires re-entering PIN/password before revealing patient charts.
- **Current vs Expected Behavior**:
  - *Current*: User remains logged in indefinitely until the tab is closed or JWT expires (up to 24 hours). An unattended laptop in an OPD waiting room allows passing visitors or staff to view patient charts.
  - *Expected*: 
    1. Inactivity detector (`mousemove`, `keydown`, `touchstart`, `scroll`) tracks idle time.
    2. After 10 minutes of inactivity, screen blurs with modal: "Session locked due to inactivity. Enter your 4-digit PIN to resume."
    3. After 15 minutes, token is cleared and user is redirected to login.
- **Flow**: Clinic/Hospital OPD terminal usage.
- **Root Cause / Logic**: Healthcare workstation security features were not built into standard web routes.
- **Affected Files**: `frontend/src/context/AuthContext.tsx`, `frontend/src/components/layout/Navbar.tsx`
- **UI/Frontend Impact**: Floating lock indicator with PIN unlock dialog on timeout.
- **Security/Data Risk**: **High**. Unauthorized physical access to patient records on shared clinic workstations (HIPAA §164.312(a)(2)(iii) Automatic Logoff non-compliance).
- **Suggested Fix / Implementation Plan**:
  1. Create `useIdleTimer` custom hook in `frontend/src/hooks/useIdleTimer.ts`.
  2. Display PIN unlock screen on timeout.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Implement `useIdleTimer` in `frontend/src/hooks/useIdleTimer.ts`.
  - [ ] Add Screen Lock modal in AppLayout.

---

## [FE-MISSING-02] Comprehensive Offline Indicator & Service Worker Network Sync
- **Description**: While FindMedi operates in areas with spotty network coverage (suburban hospital basements, rural primary health centres), the frontend lacks a clean global offline banner and optimistic offline queue that prevents form submissions from failing abruptly when the internet drops.
- **Current vs Expected Behavior**:
  - *Current*: Clicking submit when network drops results in unhandled API error toast "Network Error / Failed to fetch", losing long prescription or clinical notes forms that the doctor typed.
  - *Expected*: 
    1. Global amber offline banner: "You are currently offline. Changes are saved locally."
    2. Draft auto-save (e.g. prescription draft saved in local IndexedDB draft cache).
    3. Reconnection auto-sync once network resumes.
- **Flow**: Doctor writing prescriptions or nursing staff recording bedside vitals.
- **Root Cause / Logic**: Web application assumed steady broadband connectivity.
- **Affected Files**: `frontend/src/components/layout/OfflineBanner.tsx`, `frontend/src/lib/api.ts`
- **UI/Frontend Impact**: Non-intrusive offline badge and draft persistence.
- **Security/Data Risk**: **Low**. High clinical UX and data preservation value.
- **Suggested Fix / Implementation Plan**:
  1. Add `useOnlineStatus` hook listening to `navigator.onLine`.
  2. Implement local draft persistence for clinical notes and prescription forms.
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Implement `OfflineBanner` component.
  - [ ] Add auto-save draft mechanism to `DoctorPrescriptions.tsx`.
