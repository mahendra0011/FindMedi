# Mental Health — Missing Features & Capabilities

## [MH-MISSING-01] Nominated Representative & Advance Directive Workflow (MHCA 2017)
- **Description**: Sections 5 and 14 of the Mental Healthcare Act, 2017 give every adult the legal right to make an Advance Directive (stating how they wish to be cared for and not cared for in the event of a mental health crisis) and appoint a Nominated Representative. FindMedi currently has no schema or workflow for managing mental health advance directives.
- **Current vs Expected Behavior**:
  - *Current*: No support for Advance Directives or Nominated Representative designation.
  - *Expected*: 
    1. Patient can upload or digitally draft an Advance Directive.
    2. Register a verified Nominated Representative (with Aadhaar/mobile OTP verification).
    3. In the event of acute psychiatric admission or crisis, the Nominated Representative is automatically notified and granted view access to the directive.
- **Flow**: Patient managing psychiatric care preferences and crisis planning.
- **Root Cause / Logic**: Platform EHR lacked specialized psychiatric legal compliance models.
- **Affected Files**: `backend/src/models/MentalHealthConsent.js`, `backend/src/routes/mentalHealth.js`, `backend/src/services/mentalHealthAccess.js`
- **UI/Frontend Impact**: "My Advance Directive & Representative" tab in MindSupport settings.
- **Security/Data Risk**: **Medium**. Non-compliance with statutory Indian mental healthcare rights.
- **Suggested Fix / Implementation Plan**:
  1. Create `AdvanceDirective.js` model with fields for preferred treatments, refused medications, and designated representative.
  2. Implement verification and consent revocation routes.
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Create `AdvanceDirective.js` Mongoose schema.
  - [ ] Add CRUD routes in `mentalHealth.js`.

---

## [MH-MISSING-02] Discreet / Ghost Mode Session Camouflage for Shared Household Devices
- **Description**: Patients consulting psychologists or psychiatrists often share mobile phones or laptops with family members or abusive partners. While a discreet notification copy helper exists (`discreetCopy.js`), there is no quick-exit "Panic / Camouflage" button in the mental health UI that instantly clears the screen, masks browser history, and replaces the tab with a generic weather or news page.
- **Current vs Expected Behavior**:
  - *Current*: User has to manually navigate away or close the tab, leaving active sessions and history visible.
  - *Expected*: Persistent "Quick Exit (ESC)" button that immediately:
    1. Replaces current DOM with a simulated educational/weather portal.
    2. Wipes sensitive mental health state from memory and local storage.
    3. Replaces browser title and favicon.
- **Flow**: Domestic violence victim or distressed adolescent seeking discreet tele-counseling.
- **Root Cause / Logic**: Frontend lacked crisis safety UI primitives.
- **Affected Files**: `frontend/src/mind/components/MindLayout.tsx`, `frontend/src/mind/context/MindAuthContext.tsx`
- **UI/Frontend Impact**: Discrete floating button on top right of all mental health screens.
- **Security/Data Risk**: **High**. Physical danger to vulnerable patients if unauthorized family members discover psychiatric therapy records.
- **Suggested Fix / Implementation Plan**:
  1. Add `QuickExitButton` component in `frontend/src/mind/components/ui/QuickExitButton.tsx`.
  2. Bind to double-press of `ESC` key.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Implement QuickExitButton in frontend MindLayout.
  - [ ] Add session cache wipe on trigger.
