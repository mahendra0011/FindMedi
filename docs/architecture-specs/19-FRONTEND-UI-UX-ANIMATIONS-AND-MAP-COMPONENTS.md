# 19 - Frontend UI/UX, Animations, Audio & Map Components Specification

## 1. Aesthetic Philosophy & Visual Identity
FindMedi rejects generic, flat UI templates. The application incorporates a **sleek, high-performance dark/light glassmorphic theme** featuring:
- **Neon Accents**: Emergency Red (`#EF4444`), Medical Cyan (`#06B6D4`), Advocate Gold (`#F59E0B`), and Taxi Amber (`#EAB308`).
- **Surface Elevation**: Multi-layered backdrop blurs (`backdrop-blur-md bg-slate-900/80 border border-slate-800/80`).
- **Typography**: Inter / Outfit fonts with tabular numbers (`font-mono tracking-tight`) for timers, speeds, and coordinates.

---

## 2. Animation Architecture: Division of Responsibilities

```
                                    ANIMATION STACK
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
   FRAMER MOTION                         GSAP                              LENIS
  - Modal entrances/exits          - Radar pulse waves             - Inertia smooth scroll
  - Sheet slide-up drawers         - Dispatch radar sweeps         - Parallax hero sections
  - Tab state transitions          - Complex SVG countdowns        - Dashboard tables
  - Expandable cards               - Telemetry counter rolling
```

### Framer Motion: Full-Screen Alert Modal Transitions
```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.92, y: 40 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.85, y: -30 }}
  transition={{ type: "spring", damping: 25, stiffness: 350 }}
  className="fixed inset-0 z-[99999] flex flex-col justify-between bg-slate-950/95 p-6 backdrop-blur-xl"
>
  {/* Modal Content */}
</motion.div>
```

### GSAP: Multi-Ring Radar Pulse Animation
Used in customer waiting screens while searching for nearby drivers or doctors:
```typescript
gsap.to(".radar-ring", {
  scale: 4,
  opacity: 0,
  stagger: 0.6,
  duration: 2.4,
  repeat: -1,
  ease: "power2.out"
});
```

---

## 3. Map Component Architecture (Leaflet + MapTiler + Turf)

```
┌────────────────────────────────────────────────────────┐
│                      MAP CANVAS                        │
│   React-Leaflet Container with MapTiler Vector Tiles   │
│                                                        │
│  [ Marker 1: Pickup Pin (Animated pulse SVG) ]         │
│  [ Marker 2: Live Provider Car (60fps LERP glide) ]    │
│  [ Dynamic Polyline: Gradient path (Valhalla encoded) ]│
│                                                        │
│  HUD Overlays (Floating Glass Cards):                  │
│  - Speed & ETA badge (Top Right)                       │
│  - Driver Profile Sheet (Bottom Swipe Drawer)          │
│  - Floating Emergency SOS Button (Top Left)            │
└────────────────────────────────────────────────────────┘
```

### Map Performance Optimization Rules:
1. **Disable Unnecessary Re-renders**: Wrap Leaflet components in `React.memo` and control camera zoom updates via imperative `map.flyTo()` rather than state prop changes.
2. **Cluster Offline Markers**: Use `react-leaflet-cluster` for admin views rendering 5,000+ points simultaneously.
3. **Canvas Path Rendering**: Render polylines using HTML5 Canvas mode (`preferCanvas: true`) rather than SVG DOM elements.

---

## 4. Universal Provider Incoming Alert Component
Every provider dashboard embeds the standardized full-screen incoming modal component:
- Component Path: `frontend/src/components/emergency/ProviderIncomingCall.tsx`
- Features:
  - Looping programmatic audio alarm (`frontend/src/utils/alarmAudio.ts`).
  - Haptic vibration loop.
  - Circular SVG countdown timer (12s - 120s based on vertical).
  - Patient/Rider details, distance, estimated earnings, and pickup address.
  - Large dual touch targets: Full-width Green Accept vs. Red Decline.
