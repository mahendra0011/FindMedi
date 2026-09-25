# 04 - Full-Screen Incoming Dispatch Alert & Audio Siren Specification

## 1. Specification Mandate
**No passive toasts, bottom banners, or tiny badges.**
Every on-demand request across **all 5 verticals (Rider, Lawyer, Assistant, SOS Ambulance, Emergency Doctor)** MUST trigger a **Full-Screen Hardware-Interception Incoming Call Modal**.
This replicates the high-urgency UX of an incoming phone call or an Uber Driver / 911 dispatch terminal.

---

## 2. Visual Layout & UX Wireframe

```
┌────────────────────────────────────────────────────────────────────────┐
│ [RED / AMBER EMERGENCY PULSE BANNER - FLASHING 1.2s LOOP]             │
│                                                                        │
│                🚨 NEW INCOMING REQUEST: EMERGENCY DOCTOR               │
│                                                                        │
│                       ⏱️ TIME REMAINING TO RESPOND                     │
│                             [ 28 SECONDS ]                             │
│                  (Circular SVG countdown animated bar)                 │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     PATIENT & TRIP DETAILS                       │  │
│  │  Name: Priya Sharma (Age 34, Female)                             │  │
│  │  Severity: CODE RED - Acute Chest Pain / Respiratory Distress    │  │
│  │  Distance: 2.4 km away (Valhalla Road ETA: 6 mins)                │  │
│  │  Pickup: Sector 62, Noida, Near Fortis Hospital                 │  │
│  │  Estimated Payout: ₹1,450                                        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                MINI RADAR ROUTE PREVIEW (LEAFLET)                │  │
│  │  [ Doctor Pos 📍 ] ═══════════════════ [ Patient 🚑 ]            │  │
│  │  Route distance: 2.8 km | Traffic: Moderate                      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐  │
│  │          DECLINE              │  │           ACCEPT              │  │
│  │         (RED BUTTON)          │  │        (GREEN BUTTON)         │  │
│  │   Tap to pass to next doctor  │  │    Instant Lock & Navigate    │  │
│  └───────────────────────────────┘  └───────────────────────────────┘  │
│                                                                        │
│ 🔊 Continuous Siren Ringtone Playing | Vibration Haptic Active [800ms] │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Web Audio API Siren Synthesis (Zero Asset Failure)

Relying on external `.mp3` files frequently fails in mobile browsers due to network latency, CORS blocks, or asset 404s.
FindMedi enforces **Web Audio API programmatic oscillator synthesis** (already pioneered in `frontend/src/utils/alarmAudio.ts`).

### Audio Synthesis Profiles by Vertical:
1. **Emergency SOS & Ambulance**:
   - High-low dual-tone oscillating European emergency siren ($750\text{ Hz} \leftrightarrow 960\text{ Hz}$).
   - Cycle time: $600\text{ ms}$, infinite loop until user action.
2. **Emergency Doctor**:
   - Urgent rhythmic pulse alarm ($880\text{ Hz}$ tone pulsing at $4\text{ Hz}$).
3. **Rider / Driver**:
   - Uber-style ascending harmonic notification chime ($523.25\text{ Hz} \to 659.25\text{ Hz} \to 783.99\text{ Hz}$) repeating every $1.5\text{ seconds}$.
4. **Lawyer Consultation**:
   - Executive telephone ring cadence ($440\text{ Hz} + 480\text{ Hz}$ combined bell frequency).
5. **Medical Assistant**:
   - Soft urgent medical monitor beep ($1046.5\text{ Hz}$, $200\text{ ms}$ on, $300\text{ ms}$ off).

---

## 4. Hardware Wake-Lock & Haptic Vibration
To guarantee the driver/doctor does not miss the notification when their phone is locked or hands-free in a vehicle mount:
1. **Screen Wake Lock API**:
   ```typescript
   if ('wakeLock' in navigator) {
     const wakeLock = await navigator.wakeLock.request('screen');
   }
   ```
2. **Vibration API**:
   ```typescript
   if ('vibrate' in navigator) {
     // Persistent SOS vibration rhythm: [vibrate, pause, vibrate, pause]
     navigator.vibrate([500, 250, 500, 250, 1000]);
   }
   ```

---

## 5. State Machine for Full-Screen Modal

```
[ Socket Inbound: 'DISPATCH_INCOMING_ALERT' ]
                 │
                 ▼
  Acquire WakeLock + Start Siren Audio + Trigger Vibration
                 │
                 ▼
       Mount Fullscreen Viewport Overlay (z-index: 99999)
                 │
                 ▼
          Start Hardware Timer (e.g., 30s)
                 │
  ┌──────────────┼───────────────────────────┐
  ▼              ▼                           ▼
[ ACCEPT ]     [ REJECT ]                [ TIMER EXPIRED (0s) ]
  │              │                           │
  ├─ Stop Audio  ├─ Stop Audio               ├─ Stop Audio
  ├─ Release     ├─ Release WakeLock         ├─ Release WakeLock
  │  WakeLock    ├─ Emit 'DISPATCH_REJECT'   ├─ Emit 'DISPATCH_TIMEOUT'
  ├─ Emit        │  to Socket                │  to Socket
  │  'ACCEPT'    └─ Close Modal              ├─ Close Modal
  ▼                                          ▼
Transition UI to                           Mark provider inactive
Turn-by-Turn GPS Map                       if 3 consecutive timeouts
```

---

## 6. Integration Checklist for All 5 Dashboards
Every provider dashboard must import and render the standardized `<ProviderIncomingCall />` component:
- [x] **Rider Dashboard** (`frontend/src/pages/rider/RiderDashboard.tsx`)
- [x] **Lawyer Dashboard** (`frontend/src/pages/lawyer/LawyerDashboard.tsx`)
- [x] **Assistant Dashboard** (`frontend/src/pages/assistant/AssistantDashboard.tsx`)
- [x] **Ambulance / Delivery Dashboard** (`frontend/src/pages/delivery/DeliveryDashboard.tsx`)
- [x] **Clinic / Emergency Doctor** (`frontend/src/pages/clinic/ClinicDashboard.tsx`)
