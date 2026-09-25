# 05 - Rider On-Demand Mobility Specification (Uber Flow)

## 1. Vertical Overview
The Rider Mobility module enables on-demand ride booking (Auto, Bike, Mini Cab, Sedan, XL Ambulance-Taxi) using sub-second hexagonal matching, real-time driver interpolation, dynamic fare calculation, and instant payment settlement.

---

## 2. End-to-End User Experience Flow

```
   [ RIDER / CUSTOMER ]                                   [ DRIVER / PARTNER ]
            │                                                      │
 1. Enter Destination / Pickup                                     │
 2. Valhalla Route Preview + Fare Quote                            │
 3. Tap [ BOOK RIDE NOW ]                                          │
            │                                                      │
            ▼ (HTTP POST /rides/request)                           │
   [ Backend Matching Engine ]                                     │
            │ (H3 Res 8 Radial Search)                             │
            │                                                      │
            ├─────────────── Socket.IO Inbound ───────────────────►│
            │                'DISPATCH_INCOMING_ALERT'             │
            │                                                      │
            │                                             4. Fullscreen Modal Pops
            │                                                Sound chime loops
            │                                                15s countdown
            │                                                      │
            │◄─────────────── Socket.IO Outbound ──────────────────┤
            │                 'DISPATCH_ACCEPT'                    │
            │                                                      │
 5. Rider UI Updates:                                     6. Driver UI Switches to:
    - Driver Name, Car Model, Plate                          - Turn-by-Turn GPS to Pickup
    - Live 60fps moving car on map                           - [ ARRIVED AT PICKUP ] button
            │                                                      │
 7. Driver Arrives -> Rider gets OTP Notification                  │
            │                                                      │
 8. Driver inputs 4-digit OTP -> Trip Transitions to 'IN_PROGRESS' │
            │                                                      │
 9. Live GPS streaming during transit (Valhalla polyline update)   │
            │                                                      │
10. Driver taps [ COMPLETE TRIP ]                                  │
            │                                                      │
11. Fare finalized, Razorpay auto-deduct / Cash prompt             │
12. Dual Rating & Review modal (Rider & Driver)                    │
```

---

## 3. Data Schema & Lifecycle States

### MongoDB Model: `RideBooking`
```typescript
interface IRideBooking {
  _id: ObjectId;
  riderId: ObjectId;
  driverId?: ObjectId;
  vehicleType: 'BIKE' | 'AUTO' | 'CAB_MINI' | 'CAB_SEDAN' | 'AMBULANCE_TAXI';
  pickup: {
    address: string;
    coordinates: [number, number]; // [lng, lat]
    h3_res8: string;
  };
  destination: {
    address: string;
    coordinates: [number, number];
    h3_res8: string;
  };
  fare: {
    baseFare: number;
    distanceKm: number;
    perKmRate: number;
    surgeMultiplier: number;
    totalAmount: number;
    currency: 'INR';
  };
  otp: string; // 4-digit secret
  status: 
    | 'SEARCHING' 
    | 'ASSIGNED' 
    | 'ARRIVED_AT_PICKUP' 
    | 'IN_PROGRESS' 
    | 'COMPLETED' 
    | 'CANCELLED';
  cancellationReason?: string;
  cancelledBy?: 'RIDER' | 'DRIVER' | 'SYSTEM_TIMEOUT';
  timestamps: {
    requestedAt: Date;
    assignedAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
  };
}
```

---

## 4. Real-Time Driver Marker Interpolation (60 FPS Smooth Movement)

Raw GPS points arrive from the driver phone every 1-3 seconds. If rendered directly to Leaflet, the vehicle marker jumps or stutters abruptly.

### Mathematical Linear Interpolation (LERP) Protocol
```typescript
// Frontend vehicle marker state interpolator
interface PositionPoint {
  lat: number;
  lng: number;
  bearing: number;
  timestamp: number;
}

function interpolatePosition(prev: PositionPoint, next: PositionPoint, progress: number): [number, number] {
  const lat = prev.lat + (next.lat - prev.lat) * progress;
  const lng = prev.lng + (next.lng - prev.lng) * progress;
  return [lat, lng];
}
```
1. Driver sends GPS payload with current bearing (heading in degrees).
2. Frontend animation loop (`requestAnimationFrame`) smoothly glides marker from `prevPos` to `nextPos` over the expected update interval (e.g., $1000\text{ ms}$).
3. Marker icon rotates dynamically to match compass bearing without map re-centering jitter.

---

## 5. Security & Verification Guardrails
- **4-Digit Pickup OTP**: Prevents a driver from starting the ride before the rider is physically inside the vehicle.
- **Geofence Pickup Enforcement**: The driver cannot press `[ ARRIVED ]` unless their live GPS is within 150 meters of the pickup pin (`turf.distance <= 0.15`).
- **Emergency In-Ride SOS**: A red floating SOS shield in the rider UI broadcasts emergency coordinates to police authorities and trusted emergency contacts instantly.
