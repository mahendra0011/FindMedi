## Root cause found

You complained *"koi setting apply hi nahi ho rahi"*. I found the bug:

**`PUT /doctors/:id/schedule` (server/routes/doctors.js:437-464) blocks clinic doctors.** The authorization check only allows `superadmin` + `hospital_admin`, AND the ownership check only compares `hospitalId` — but clinic doctors have `facilityId`, not `hospitalId`. So every time you save your schedule in `ClinicSchedule.jsx`, the server returns **403** and nothing persists. That's why your consultation-duration change never shows up in the booking modal — the `time_slots` array stays stuck on the default hourly values (`9:00 AM`, `10:00 AM`, …) instead of regenerating to `9:00 AM, 9:15 AM, 9:30 AM…`.

The BookingModal also displays slots from `doctor.time_slots` as a flat dropdown with single times — there is no hour-grouping with sub-slot ranges as you want.

## Tasks

### 1. Backend — fix the schedule route so clinic doctors can save (`server/routes/doctors.js`)
In `PUT /:id/schedule` (line 437):
- Allow `clinic_doctor` role in the auth check (add to the role list).
- Fix the ownership check: instead of only comparing `hospitalId`, also compare `facilityId` (same pattern already used in `/me/auto-confirm`, `/my-facility/auto-confirm`, and `/:id/slot-capacity` lines 122-227).
- Keep `generateTimeSlots()` as-is — it already produces `["09:00 AM", "09:15 AM", ...]` correctly when slotDuration is applied. After this fix, the regenerated slots will actually persist.

No model change needed — `Doctor.slotDuration` already exists (default 15).

### 2. Backend — make booked-slots API return counts, not just full-slot strings (`server/routes/appointments.js:107-124`)
Right now `GET /booked-slots` returns `["10:00 AM"]` (only full slots), and BookingModal builds `slotCounts` from it — so remaining-capacity numbers are wrong (always 0 or 1). Change the response to return `{ counts: { "10:00 AM": 2, "09:15 AM": 1 }, capacity: 3 }`. Update `BookingModal.jsx` to read `counts` and `capacity` from the new shape. This makes "(2/3 left)" accurate.

### 3. Remove "Patients Per Time Slot" from Clinic Platform Settings only (`client/src/pages/clinic/ClinicPlatformSettings.jsx`)
Per your answer — only remove it here (it's duplicated in My Schedule anyway, so it's confusing). Remove:
- `maxSlot` state (line 15)
- the `useEffect` that calls `getMySlotCapacity` (lines 52-54)
- `updateMySlotCapacity(maxSlot)` call in `handleSave` (line 62)
- the entire "Patients Per Time Slot" UI block (lines 151-157)

Leave `DoctorProfile.jsx`, `AdminHospitalSettings.jsx`, the backend routes, and the `maxBookingsPerSlot` model field untouched — they remain working. Default capacity stays 1.

### 4. BookingModal — redesign the time-slot picker to hour-grouped boxes with sub-slot ranges (`client/src/components/BookingModal.jsx`)

Replace the current `<select>` dropdown (lines 335-349) with a two-level UI:

**Step A: Hour selector** — group `currentDoc.time_slots` into hours. If `slotDuration` ≤ 30, show clickable hour-boxes (e.g. `9 AM`, `10 AM`, `11 AM`, `2 PM`…) derived from the actual slots. Show "Average time" pill = `slotDuration mins` next to the label.

**Step B: Sub-slot boxes** — when an hour is selected, render that hour's actual slots as small grid boxes, each labeled with the **time range** (start → start+slotDuration), e.g. `9:00–9:15`, `9:15–9:30`, `9:30–9:45`. Full slots get disabled + "Full" label; available ones show remaining count. Clicking one sets `bookingTime` to the slot's start time (e.g. `09:00 AM`).

Helper to build ranges: parse `slotDuration` from `currentDoc.slotDuration` (fallback 15), convert each slot string to 24h, add duration, format back to `h:mm`.

Keep the existing selected-time confirmation pill below the picker, but show the **range** (e.g. `9:00 AM – 9:15 AM`) instead of just the start time.

Keep the existing full-slot disable logic — just feed it the corrected `counts`/`capacity` from task 2.

## Files touched
- `server/routes/doctors.js` — auth fix in `PUT /:id/schedule`
- `server/routes/appointments.js` — `GET /booked-slots` returns counts+capacity
- `client/src/pages/clinic/ClinicPlatformSettings.jsx` — remove the duplicate setting
- `client/src/components/BookingModal.jsx` — hour-grouped slot picker with ranges

## Testing checklist
1. Log in as clinic doctor → My Schedule → change Consultation Duration to 15 → Save → reload page → Time Slots should now show `09:00 AM, 09:15 AM, 09:30 AM…` (previously stayed on hourly).
2. Open BookingModal for that doctor → confirm hour boxes appear, clicking an hour shows `9:00–9:15`, `9:15–9:30` sub-slots, "Average time 15 mins" pill visible.
3. Book a slot as a patient → re-open modal → that sub-slot should show reduced remaining count (or Full).
4. Clinic Platform Settings → confirm "Patients Per Time Slot" block is gone, Save still works for auto-confirm.
5. Verify esbuild compiles cleanly on the two changed client files.