# 12 - Redis State Machine, Ephemeral Caching & Distributed Locks

## 1. Role of Redis Cluster in FindMedi
Redis is the sub-millisecond operational memory tier. It stores state that changes too frequently for disk-based MongoDB:
- Driver live GPS telemetry and H3 cell memberships.
- Active ride state machines and dispatch timeouts.
- Redlock distributed locks to eliminate double-booking.
- Global API rate limiting token buckets.
- Turn-by-turn routing cache.

---

## 2. Distributed Locking Protocol (Redlock)

### Lock Key Structure
```
lock:provider:<providerId>        // Prevent provider double-assignment
lock:booking:<bookingId>          // Prevent concurrent state updates
lock:payment:<transactionId>      // Idempotent payment capture
```

### Safe Acquisition & Release (Lua Script)
To avoid releasing someone else's lock if an operation takes longer than the TTL:
```lua
-- Safe Lock Release Script
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
```
- `KEYS[1]`: Lock key (e.g. `lock:provider:drv_99`)
- `ARGV[1]`: Randomly generated UUID secret held only by the requesting process.

---

## 3. Ephemeral State Key Hierarchy

```
1. Active Driver Tracking Hash:
   Key: driver:active:<driverId>
   Fields:
     lat: 28.5355
     lng: 77.3910
     vertical: "rider"
     status: "AVAILABLE" | "ASSIGNED" | "EN_ROUTE"
     currentBookingId: "book_xyz123"
     h3_cell_res8: "8828308281fffff"
     lastPing: 1727265900000
   TTL: 90 seconds (Auto-expires if phone loses connection)

2. Active Booking Ephemeral State:
   Key: booking:state:<bookingId>
   Fields:
     vertical: "emergency_sos"
     status: "SEARCHING_PROVIDER"
     attemptedProviders: ["drv_01", "drv_02"]
     currentCandidate: "drv_03"
     expiresAt: 1727265925000
   TTL: 1 hour

3. Geospatial Hexagon Sets:
   Key: geo:h3:<resolution>:<cell_index>:<vertical>
   Value: Redis Set of provider IDs currently inside that hexagon.

4. Turn-by-Turn Route Polyline Cache:
   Key: cache:valhalla:route:<originH3_res9>:<destH3_res9>:<costing>
   Value: Encoded polyline string + distance + duration seconds
   TTL: 24 hours (Significantly reduces duplicate Valhalla queries along common corridors)
```

---

## 4. Redis Streams for High-Frequency GPS Buffering

Instead of executing direct database writes for 10,000 drivers pinging coordinates every second ($10,000\text{ writes/sec}$):
```
Driver GPS Ping ──► POST /location ──► XADD stream:telemetry:gps * providerId drv_99 lat 28.53 lng 77.39
                                              │
                                              ▼
                                 Redis Stream Buffer
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
            Worker 1 (H3 Binning)                           Worker 2 (Kafka Shipper)
          Updates `geo:h3` Sets                          Publishes to Kafka telemetry topic
```
This architecture absorbs massive spikes without degrading MongoDB throughput.
