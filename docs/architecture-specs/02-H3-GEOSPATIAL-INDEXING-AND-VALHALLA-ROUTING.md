# 02 - Uber H3 Geospatial Indexing & Valhalla Routing Engine

## 1. Uber H3 Hexagonal Hierarchical Spatial Index

### Why H3 Hexagons Over Square Grids or GeoJSON Polygons?
1. **Uniform Adjacency**: Unlike squares where diagonal neighbors have a distance of $\sqrt{2} \times d$, all 6 neighbors of an H3 hexagon share an identical distance from the central cell center.
2. **Reduced Quantization Error**: Hexagons minimize edge distortion when clustering vehicle locations across spherical earth surfaces.
3. **Hierarchy Invariance**: Resolution nesting allows lightning-fast parent-child rollups for surging, heatmaps, and multi-tier searches.

---

## 2. H3 Resolution Mapping for FindMedi Verticals

| H3 Resolution | Avg Hexagon Area ($km^2$) | Avg Hexagon Edge ($m$) | FindMedi Use Case |
|---|---|---|---|
| **Res 6** | $36.12$ | $3,229$ | Regional Emergency SOS surge zones, Inter-city Ambulance routing |
| **Res 7** | $5.16$ | $1,220$ | Lawyer & Medical Assistant candidate clustering, city-wide surge |
| **Res 8** | $0.73$ | $461$ | Urban Rider / Cab pickup dispatch, Driver live location binning |
| **Res 9** | $0.10$ | $174$ | High-density urban drop-off & pickup pin snapping |

---

## 3. Redis In-Memory Geospatial Layout with H3

Instead of querying heavy MongoDB 2dsphere indexes every second for 10,000 drivers, active provider locations are indexed directly in Redis Sets using H3 cell keys:

```
Key Format:
geo:h3:<resolution>:<cell_index>:<vertical>

Examples:
geo:h3:8:8828308281fffff:rider      -> Set [ "driver_u123", "driver_u456" ]
geo:h3:7:87283082bffffff:lawyer     -> Set [ "lawyer_l88", "lawyer_l99" ]
geo:h3:7:87283082bffffff:assistant  -> Set [ "asst_a10", "asst_a12" ]
geo:h3:6:862830827ffffff:ambulance  -> Set [ "amb_sos_01", "amb_sos_02" ]

Live Provider Coordinates Hash:
provider:location:<providerId>
{
  "lat": 28.6139,
  "lng": 77.2090,
  "bearing": 182.4,
  "speed": 34.2,
  "h3_res8": "8828308281fffff",
  "h3_res7": "87283082bffffff",
  "lastSeen": 1727265890000,
  "status": "ONLINE_AVAILABLE"
}
```

### Driver Relocation & Bin Transition Logic
When a provider submits a GPS ping:
1. Compute `newCell = h3.latLngToCell(lat, lng, 8)`.
2. Check `oldCell = provider.h3_res8`.
3. If `newCell !== oldCell`:
   - Redis pipeline:
     - `SREM geo:h3:8:<oldCell>:<vertical> <providerId>`
     - `SADD geo:h3:8:<newCell>:<vertical> <providerId>`
     - Update provider hash with `newCell`.
   - Publish light Kafka event: `provider.cell.migrated`.

---

## 4. Multi-Ring Candidate Expansion (k-Ring)

When a customer initiates a booking at coordinate `(lat, lng)`:
```
Target Coordinate: (lat, lng)
      │
      ▼
originCell = h3.latLngToCell(lat, lng, Res)
      │
      ▼
candidateCells = h3.gridDisk(originCell, k)
      │
      ├── Ring 0: Center cell (immediate vicinity)
      ├── Ring 1: 6 adjacent cells (~1.2 km radius at Res 8)
      └── Ring 2: 12 outer cells (~2.4 km radius at Res 8)
      │
      ▼
Redis SUNION candidateCells -> List of online active Provider IDs
```

If Ring 0-1 yields fewer than 3 providers, expand `k` dynamically (up to `k=3` for riders, `k=5` for ambulances).

---

## 5. Valhalla Routing Engine Integration

### Why Valhalla?
- **Dynamic Costing**: Supports pedestrian, bicycle, auto, bus, and emergency vehicle costing models.
- **Matrix API**: Computes many-to-one or one-to-many travel times in a single sub-50ms HTTP/gRPC request.
- **Map Matching**: Snaps raw noisy GPS coordinates directly to OSM road centerlines with heading reconciliation.

### 1-to-N Valhalla Matrix Candidate Ranking
After Redis returns 10-15 candidate providers from the H3 k-ring:
```json
POST /sources_to_targets
{
  "sources": [
    {"lat": 28.6140, "lon": 77.2095} // Rider / Patient Pickup
  ],
  "targets": [
    {"lat": 28.6210, "lon": 77.2150}, // Candidate Provider 1
    {"lat": 28.6105, "lon": 77.2010}, // Candidate Provider 2
    {"lat": 28.6300, "lon": 77.2200}  // Candidate Provider 3
  ],
  "costing": "auto"
}
```

**Valhalla Matrix Response Sorting**:
```
Sort by: targets[i].time ASC (Estimated Road Seconds)
Fallback to: Haversine distance if matrix server encounters timeout.
```

The candidate with the shortest road arrival time (not straight line) receives the first full-screen incoming modal request.

---

## 6. Live Turn-by-Turn Geometry and Navigation Polylines

Once a provider accepts:
1. Call Valhalla `/route`:
   - Inputs: Provider Live GPS $\to$ Customer Pickup $\to$ Destination.
2. Store encoded polyline (`precision 6`) in Redis under key `ride:route:<bookingId>`.
3. Push to both Customer and Provider Socket.IO rooms.
4. Frontend decodes polyline via `@mapbox/polyline` and renders a neon gradient path onto the React-Leaflet canvas.
