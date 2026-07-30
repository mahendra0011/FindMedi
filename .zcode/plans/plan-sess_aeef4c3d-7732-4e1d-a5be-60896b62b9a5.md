## Doctor Appointments — 2-Section Split (Approve + Today)

### Goal
Dono pages (Doctor + Clinic) ke appointments ko 2 sidebar sections me divide karna:
1. **Approve Appointments** — Pending appointments list with Confirm/Reject buttons
2. **Today Appointments** — Aaj ki appointments (confirmed + pending), with a tab to jump to "Approve Appointments" section

---

### Files to Modify

#### 1. `src/components/AppSidebar.jsx`
**Doctor menu** (after existing appointments entry, ~line 110):
```
{ icon: FileCheck,    labelKey: 'nav.approveAppointments', path: '/doctor/appointments/approve' }
{ icon: CalendarClock, labelKey: 'nav.todayAppointments',   path: '/doctor/appointments/today'   }
```
**Clinic menu** (after existing appointments entry, ~line 90):
```
{ icon: FileCheck,    labelKey: 'nav.approveAppointments', path: '/clinic/appointments/approve' }
{ icon: CalendarClock, labelKey: 'nav.todayAppointments',   path: '/clinic/appointments/today'   }
```
Icons already imported. Remove old single "My Appointments" entry from both.

#### 2. `src/App.jsx`
**Routes** — nested routes under existing appointments paths:
```jsx
<Route path="/doctor/appointments" element={<DoctorAppointments />}>
  <Route index element={<Navigate to="today" replace />} />
  <Route path="approve" element={<ApproveAppointments />} />
  <Route path="today" element={<TodayAppointments />} />
</Route>
```
Same pattern for `/clinic/appointments`. Uses `<Outlet />` inside a shared layout wrapper, OR simply pass a `view` prop to the existing component.

**Approach: `view` prop** (simpler, no nested routes needed):
- `/doctor/appointments/approve` → `<DoctorAppointments view="approve" />`
- `/doctor/appointments/today` → `<DoctorAppointments view="today" />`
- Same for clinic

#### 3. `src/pages/doctor/DoctorAppointments.jsx`
Major changes:
- Add `'Pending'` to `filters` array
- Add `view` prop: `'approve'` → show only Pending appointments with Confirm + Reject buttons; `'today'` → show only today's appointments (all statuses) with a tab/button linking to approve view
- Add Confirm action: `api.updateAppointment(id, { status: 'Confirmed' })` (pattern from `ClinicAppointments.jsx`)
- Today section: filter `appointments.filter(a => a.date === getISTDateString())`
- Header shows active section name + count badge
- Add a prominent "Go to Approve" tab/button at top of Today view (if pending appointments exist)
- Add `approveCount` state: shows how many pending appointments exist

#### 4. `src/pages/clinic/ClinicAppointments.jsx`
- Add `view` prop support: `'approve'` → filter status to Pending only; `'today'` → filter date to today
- Add the same "Go to Approve" tab in Today view
- The Pending + Confirm functionality already exists here, just needs the view-based filtering

#### 5. `src/lib/settings.js`
Add 2 new translation keys in all 3 language blocks:
```js
// English
'nav.approveAppointments': 'Approve Appointments',
'nav.todayAppointments':   'Today Appointments',
// Hindi
'nav.approveAppointments': 'अपॉइंटमेंट्स स्वीकृत करें',
'nav.todayAppointments':   'आज की अपॉइंटमेंट्स',
// Marathi
'nav.approveAppointments': 'अपॉइंटमेंट स्वीकार',
'nav.todayAppointments':   'आजची अपॉइंटमेंट्स',
```

---

### Layout

**Approve Appointments view:**
```
┌─────────────────────────────────────────┐
│  ✓ Approve Appointments (3 pending)     │
│                                         │
│  [Pending Card]  [Pending Card]          │
│  [  Confirm ] [  Reject ]               │
│                                         │
│  [Pending Card]  [Pending Card]          │
│  [  Confirm ] [  Reject ]               │
└─────────────────────────────────────────┘
```

**Today Appointments view:**
```
┌─────────────────────────────────────────┐
│  📅 Today Appointments (5)              │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 3 pending — Tap to approve →    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Confirmed Card]  [Confirmed Card]      │
│  [Pending Card]   [Completed Card]     │
└─────────────────────────────────────────┘
```

---

### Implementation Order
1. Add translation keys in `settings.js`
2. Update `AppSidebar.jsx` — new menu items for both roles, remove old single entry
3. Update `App.jsx` — new routes
4. Update `DoctorAppointments.jsx` — add `view` prop, Pending filter, Confirm action, Today filter, cross-link tab
5. Update `ClinicAppointments.jsx` — add `view` prop, view-based filtering, cross-link tab
6. Vite build check