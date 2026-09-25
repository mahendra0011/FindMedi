# 17 - Global Rate Limiting (GRL) & Intelligent Load Management Specification

## 1. Architectural Mandate
In a multi-vertical platform with 10,000 active users, malicious bot attacks, runaway GPS loops, or sudden panic surges must never exhaust system resources.
FindMedi implements a **two-tier load defense architecture**:
1. **Edge Tier (NGINX)**: High-speed IP connection throttling, SSL termination, and static caching.
2. **GRL Tier (Redis Sliding-Window Token Bucket)**: Distributed, user-aware, and route-aware rate limiting across all API clusters.

---

## 2. GRL Rate Limiting Rules & Quotas

```
Rate Limit Key Formats:
rl:ip:<ip_address>
rl:user:<userId>
rl:driver:<driverId>
rl:endpoint:<endpoint_name>:<userId>
```

| Tier / Endpoint | Window | Max Requests | Violation Action |
|---|---|---|---|
| **Public Auth (OTP / Login)** | 60 sec | 5 | HTTP 429 Too Many Requests + 15 min lock |
| **Driver GPS Telemetry** | 10 sec | 15 | Drop packet silently (prevent socket churn) |
| **Ride / Instant Booking Create**| 60 sec | 10 | HTTP 429 + CAPTCHA verification |
| **Emergency SOS Panic Trigger** | 60 sec | Unlimited (Bypassed)| **NEVER RATE-LIMIT CRITICAL LIFE-SAFETY SOS** |
| **Search Autocomplete** | 60 sec | 120 | HTTP 429 |

---

## 3. Redis Sliding-Window Rate Limiter (Lua Script)

```lua
-- KEYS[1]: Rate limit key (e.g. rl:user:u123)
-- ARGV[1]: Current epoch timestamp (ms)
-- ARGV[2]: Window size in ms (e.g. 60000 for 1 min)
-- ARGV[3]: Max requests allowed in window

local current_time = tonumber(ARGV[1])
local window_start = current_time - tonumber(ARGV[2])
local max_requests = tonumber(ARGV[3])

-- Remove entries older than window
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', window_start)

-- Count remaining requests
local current_requests = redis.call('ZCARD', KEYS[1])

if current_requests < max_requests then
    redis.call('ZADD', KEYS[1], current_time, current_time)
    redis.call('PEXPIRE', KEYS[1], ARGV[2])
    return 1 -- Allowed
else
    return 0 -- Throttled
end
```

---

## 4. Intelligent Load Management (Health-Aware Routing)

```
                            INCOMING INTERNET TRAFFIC
                                       │
                                       ▼
                       ┌───────────────────────────────┐
                       │   NGINX REVERSE PROXY / LB    │
                       └───────────────┬───────────────┘
                                       │
           ┌───────────────────────────┼───────────────────────────┐
           ▼                           ▼                           ▼
 ┌───────────────────┐       ┌───────────────────┐       ┌───────────────────┐
 │   API Node #1     │       │   API Node #2     │       │   API Node #3     │
 │ Active Conns: 420 │       │ Active Conns: 890 │       │ Active Conns: 150 │
 │ Health: GREEN     │       │ Health: YELLOW    │       │ Health: GREEN     │
 └───────────────────┘       └───────────────────┘       └───────────────────┘
```

### Health Feedback Loop:
Each Node.js instance exposes `/health/metrics` reporting event loop lag, CPU usage, and active socket connections.
- If event loop lag exceeds $100\text{ ms}$, the instance signals the Load Balancer to reduce weight.
- If CPU exceeds $85\%$, non-critical requests (analytics pings, review fetches) are shed with HTTP 503, preserving CPU for **Emergency SOS & Active Rides**.
