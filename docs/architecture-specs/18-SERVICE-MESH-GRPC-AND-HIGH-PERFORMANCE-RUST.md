# 18 - Service Mesh, gRPC Internal RPC & High-Performance Rust Micro-Workers

## 1. Architectural Role
While the core web and mobile endpoints communicate over HTTP/REST and Socket.IO, internal service-to-service communication is optimized for extreme throughput and low latency:
- **gRPC + Protocol Buffers**: Replaces internal JSON HTTP overhead with binary serialized HTTP/2 streams.
- **High-Performance Rust Workers**: Dedicated microservices for CPU-bound computations (GPS packet parsing, H3 batch indexing, cryptography).
- **Service Mesh (Envoy / Istio-style)**: Manages mutual TLS (mTLS), circuit breaking, dynamic canary routing, and telemetry between services.

---

## 2. Internal gRPC Service Definitions

```protobuf
syntax = "proto3";

package findmedi.matching;

service MatchingEngineService {
  rpc FindCandidates (CandidateRequest) returns (CandidateResponse);
  rpc LockAndAssign (AssignRequest) returns (AssignResponse);
}

message CandidateRequest {
  string vertical = 1;
  double pickup_lat = 2;
  double pickup_lng = 3;
  int32 max_candidates = 4;
  int32 max_k_ring = 5;
}

message Candidate {
  string provider_id = 1;
  double lat = 2;
  double lng = 3;
  double road_duration_seconds = 4;
  double road_distance_km = 5;
}

message CandidateResponse {
  repeated Candidate candidates = 1;
  int64 compute_time_ms = 2;
}

message AssignRequest {
  string booking_id = 1;
  string provider_id = 2;
  string idempotency_key = 3;
}

message AssignResponse {
  bool success = 1;
  string error_code = 2;
  string assigned_at = 3;
}
```

---

## 3. Rust High-Performance Micro-Worker (GPS Ingestion)

Node.js is single-threaded; parsing 10,000 JSON GPS pings per second consumes excessive V8 garbage collection cycles.
A lean Rust daemon (`telemetry-ingest-worker`) binds directly to an incoming UDP/gRPC port:

```rust
// Rust High-Throughput Worker Responsibilities:
// 1. Ingest raw binary GPS packet: [provider_id: 16B, lat: 8B, lng: 8B, bearing: 4B, speed: 4B]
// 2. Compute H3 Cell at Resolution 8 and 7 via native `h3o` Rust crate.
// 3. Batch pipeline into Redis Cluster without memory allocation overhead.
// 4. Forward batch slice to Kafka `telemetry.driver-locations.v1`.
// Throughput benchmark: > 120,000 packets/sec per CPU core.
```

---

## 4. Service Mesh Networking & Resiliency Policies
- **Mutual TLS (mTLS)**: Every microservice holds an ephemeral X.509 certificate issued by the cluster CA, ensuring internal packets cannot be sniffed even inside private VPC subnets.
- **Circuit Breaker Policy**: If the Valhalla routing service fails or times out for 10 consecutive requests, the circuit breaker opens for 5 seconds and automatically degrades to Haversine straight-line distance calculations.
- **Retry Budgets**: Strict max 2 retries on idempotent read RPCs, with zero retries on write operations.
