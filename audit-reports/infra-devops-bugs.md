# Infrastructure / DevOps — Bugs

Scope: `infra/nginx/nginx.conf`, `infra/docker-compose.yml`, `infra/docker-compose.dev.yml`, `infra/{valhalla,livekit,rust-telemetry}/`, `backend/src/index.js` boot/trust-proxy setup.
Companion: the security-header and rate-limit findings in `auth-security-bugs.md`.

---

## [INFRA-001] CRITICAL — No TLS despite a "TLS termination" header comment
- **Description**: `infra/nginx/nginx.conf` opens with the comment `# Spec 17 — Edge tier: TLS termination, IP throttling, static cache`, but the only server block is `listen 80; server_name _;`. There is **no** `listen 443 ssl`, no `ssl_certificate`/`ssl_certificate_key`, no TLS version or cipher configuration, no HTTP→HTTPS redirect and no HSTS. There are also no security headers of any kind (`X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `Content-Security-Policy`, `Permissions-Policy`).
- **Current vs Expected**: Current = if deployed as written, every request — passwords, JWTs, cookies, prescriptions, lab results — crosses the network in plaintext, while the app's own cookie logic (`secure`/`sameSite: 'none'` keyed off `NODE_ENV === 'production'`) assumes TLS. Expected = TLS terminated at the edge with a redirect from port 80, modern protocol/cipher settings, HSTS and the standard header set.
- **Root Cause / Logic**: The comment describes the intended design; the implementation stopped at the plain-HTTP server block — the same documentation-vs-reality gap found in `config/audit.js`, `openapi.js` and the ABDM stub. The absence of `X-Forwarded-Proto` (see INFRA-003) means the application cannot detect the real scheme even after TLS is added.
- **Affected Files**: `infra/nginx/nginx.conf` (server block, L27–L80)
- **UI/Frontend Impact**: Browsers mark the site "Not secure"; `secure` cookies will be dropped unless the proxy headers are fixed alongside TLS.
- **Security/Data Risk**: **Critical.** Complete loss of transport confidentiality and integrity for authentication and PHI; a passive observer on the same network captures credentials and medical data. Any compliance claim is invalid until this is fixed.
- **Steps to Reproduce**: Inspect the config for `ssl_certificate` (absent), then deploy and run `curl -v http://<host>/api/auth/login`.
- **Suggested Fix / Implementation Plan**: Add a TLS server block (Let's Encrypt/ACM), a 301 redirect from port 80, `ssl_protocols TLSv1.2 TLSv1.3` with a modern cipher suite, HSTS with a conservative initial `max-age`, and the standard security headers (CSP once nonces exist — see AUTH-018). Add `proxy_set_header X-Forwarded-Proto $scheme` on every location and configure `app.set('trust proxy', ...)` to match. Fix the comment or the config; they must agree.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] TLS server block + certificate provisioning/renewal
  - [ ] HTTP → HTTPS redirect; HSTS
  - [ ] `X-Forwarded-Proto` + `trust proxy` alignment
  - [ ] Security headers (CSP after nonce support)
  - [ ] Verify cookie `secure`/`sameSite` behaviour end-to-end behind TLS

---

## [INFRA-002] HIGH — `rate=5r/m` applied to all of `/api/auth/` will lock out real users
- **Description**: `limit_req_zone $binary_remote_addr zone=auth_edge:10m rate=5r/m;` is applied to `location /api/auth/ { limit_req zone=auth_edge burst=5 nodelay; }` — five requests per **minute** per source IP across the whole auth surface (login, registration, OTP send/verify, refresh, 2FA setup/verify, password reset). The key is the remote IP, not the account, so all users behind one NAT or corporate egress share a single bucket.
- **Current vs Expected**: Current = a normal signup, or a couple of failed logins, consumes the entire allowance for everyone behind that IP; the SPA's token refresh and the OTP retry flow hit refusals that look like outages. Expected = per-IP **and** per-account budgets with a sane burst, a distinction between endpoint classes (login/OTP strict; refresh/token lenient), and 429 responses with `Retry-After` rather than nginx's 503.
- **Root Cause / Logic**: A single blunt edge limit chosen as defence-in-depth without measuring the auth request pattern, layered on top of two other unmeasured layers — application `express-rate-limit`, GRL Redis and nginx make the effective limit unpredictable to operators and to the frontend.
- **Affected Files**: `infra/nginx/nginx.conf` (zone definition + `/api/auth/` location), `middleware/rateLimit.js`, `index.js` GRL configuration
- **UI/Frontend Impact**: **Yes** — intermittent, unexplained auth failures for real users, most visible on shared/NAT networks.
- **Security/Data Risk**: **Medium (availability) with a high second-order security impact**: because the limit is IP-scoped, an attacker can deliberately exhaust the bucket for a shared IP (e.g. a hospital's egress) and deny login to an entire organisation — a cheap targeted denial of service against staff.
- **Steps to Reproduce**: From one IP, make 6 auth calls inside a minute → subsequent calls are refused at the edge; repeat behind a shared NAT to observe cross-user impact.
- **Suggested Fix / Implementation Plan**: Remove the nginx auth limit in favour of the application layer (which can key by account and return structured 429s), or raise it substantially (e.g. `rate=30r/m burst=20`) and split strict/lenient classes. Consolidate to **one** documented rate-limit strategy with a table of effective limits per endpoint family, returning `429` + `Retry-After` for the frontend to handle.
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Decide the single authoritative rate-limit layer
  - [ ] Per-account limits in addition to per-IP
  - [ ] Document the effective limits per endpoint family
  - [ ] 429 + `Retry-After` handling in the frontend
  - [ ] Load-test the auth flows against the chosen limits
  - [ ] Confirm the emergency-path bypass cannot be abused (currently unthrottled by design)

## [INFRA-003] HIGH — The `/api/auth/` nginx location drops all proxy headers, breaking client-IP attribution
- **Description**: The `/api/auth/` location sets only `limit_req` and `proxy_pass`. It omits every header the other two proxied locations set — `X-Forwarded-For`, `X-Forwarded-Proto`, the `Upgrade`/`Connection` pair — and omits the explicit upstream timeouts used elsewhere. Consequences: (1) the Node app cannot see the real client IP on auth requests, so `req.ip` — used for audit rows (`auditLog(..., { ip: req.ip })`) and as the key for `express-rate-limit`/`totpLimiter` — resolves to the proxy address; (2) every auth request therefore shares one rate-limit bucket, so one noisy client can lock out an entire organisation while a distributed attacker stays unthrottled; (3) `secure` cookie and redirect decisions cannot see the real scheme; (4) websocket upgrades on any auth path cannot complete.
- **Current vs Expected**: Current = the most security-sensitive routes have the worst observability and the least meaningful throttling, and every login audit row records the wrong IP address. Expected = a single shared proxy-header block applied to all locations (ideally via an `include` snippet), plus `app.set('trust proxy', 1)` so Express honours `X-Forwarded-For`.
- **Flow**: Login, registration, OTP, 2FA and refresh — the routes whose forensic value is highest and whose abuse is most likely.
- **Root Cause / Logic**: Three hand-written `location` blocks with copy-pasted-but-incomplete directives; no shared snippet, so the auth block silently diverged.
- **Affected Files**: `infra/nginx/nginx.conf` (L33–L41 vs L43–L58), `backend/src/index.js` (trust-proxy configuration), `middleware/audit.js`, `middleware/rateLimit.js`
- **UI/Frontend Impact**: None visible, which is the problem — the defect stays hidden until an incident review cannot answer "from where?".
- **Security/Data Risk**: **High.** Non-repudiation and incident response are undermined for exactly the events that matter (authentication), and the rate-limit key that other controls depend on is wrong on those routes.
- **Steps to Reproduce**: Log in, then inspect the resulting `AuditLog` document's `ip` field (or log `req.ip`): it is the nginx/proxy address, not the client's.
- **Suggested Fix / Implementation Plan**: Extract a shared `proxy_common.conf` with the full header set (`Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, `Upgrade`, `Connection`) and `include` it in every location. Configure `app.set('trust proxy', <hop count>)` in `index.js` and log a warning at boot when the resolved `req.ip` is a private/loopback address. Re-test per-IP rate limiting end-to-end.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Shared proxy-header snippet included in every location
  - [ ] `trust proxy` configured and verified
  - [ ] Add `X-Forwarded-Proto` for scheme detection
  - [ ] Verify `req.ip` in audit rows is the real client
  - [ ] Re-test per-IP rate limits through the proxy

---

## [INFRA-004] No `client_max_body_size` (1 MB default vs 25 MB app limit), unauthenticated Valhalla proxy, single upstream host
- **Description**: Three edge-layer defects. (a) `nginx.conf` never sets `client_max_body_size`, so nginx's **1 MB** default applies while the application accepts uploads up to 25 MB — larger medical documents or lab reports fail at the edge with a 413 the application never sees, and the user gets an opaque error. (b) `location /route/ { proxy_pass http://valhalla_router; }` exposes the routing engine with no auth and no `limit_req`/`limit_conn` (see RIDE-005), so the CPU-heavy router is publicly callable. (c) `upstream findmedi_api` lists one active server with two commented out, using `host.docker.internal:5001` — a single point of failure that also couples the container to the host, so the documented "1–3 Node instances" scaling is not actually configured.
- **Current vs Expected**: Current = large uploads fail confusingly at the edge, the router is an unauthenticated CPU sink, and there is no redundancy. Expected = an explicit `client_max_body_size` matched to the application limit (with the same constant in the frontend's client-side check), a throttled or network-restricted route location, and either multiple real upstreams or an explicit documented single-instance decision.
- **Root Cause / Logic**: Edge defaults accepted implicitly; the upstream list left in its "scaled out later" shape.
- **Affected Files**: `infra/nginx/nginx.conf` (`http` block, `/route/` location, `upstream findmedi_api`), `middleware/upload.js`, `routes/upload.js`
- **UI/Frontend Impact**: **Yes** — uploads above 1 MB fail with no actionable message; the frontend's own size limit must match or the user is misled twice.
- **Security/Data Risk**: **Medium.** Availability (upload failures, router DoS, no failover). The size-limit mismatch is the highest-frequency user-visible outcome of the three.
- **Steps to Reproduce**: Through nginx, POST a 2 MB file to the upload endpoint → 413, with nothing logged by the application. Then loop `/route/` to load the router.
- **Suggested Fix / Implementation Plan**: Set `client_max_body_size 26m;` in the `http` block (above the app's 25 MB limit, aligned with the upload middleware), make the frontend enforce the same number, add `limit_req`/`limit_conn` to `/route/`, and document the intended instance count with real upstream entries.
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Explicit `client_max_body_size` matching the app limit
  - [ ] Frontend size validation aligned to the same constant
  - [ ] Throttle and restrict `/route/`
  - [ ] Real upstream entries or a documented single-instance decision
  - [ ] Add `/route/` and upload paths to the smoke tests

## [INFRA-005] Compose has no resource limits, one healthcheck, inline secrets and no log configuration
- **Description**: In `infra/docker-compose.yml`: (a) `deploy:` appears only as a commented-out line — there are **no CPU or memory limits** on any service, so a single runaway container (for example the ReDoS in REC-006, or Valhalla under the unauthenticated load in RIDE-005) can starve every other service on the host; (b) only one service (the ClamAV scanner) declares a `healthcheck`, so there is no startup ordering and no detection when the API, Redis, Mongo, Postgres, Kafka or OpenSearch are unhealthy — containers stay "up" while broken; (c) credentials are supplied as plain `environment:` values (`POSTGRES_USER: findmedi`, etc.) in a committed file rather than via an `.env`/`env_file:`, Docker secrets or a managed secret store; (d) no `logging:` driver configuration exists on any service, so container logs grow unbounded on the host disk — a well-known way for a busy service to fill a volume and take the host down.
- **Current vs Expected**: Current = a deployment with no blast-radius control, no health-based orchestration, secrets in git and unbounded logs. Expected = memory/CPU limits per service, healthchecks on every long-running service with `depends_on: condition: service_healthy`, secrets injected from the environment or a secret store (never committed), and `json-file` with `max-size`/`max-file` or a central log driver.
- **Flow**: All runtime behaviour; these are the failures that turn a single fault into an outage or an unexplained disk-full incident.
- **Root Cause / Logic**: The compose file was written for local development and then used as the deployment description; `deploy:` was commented out to silence a warning instead of defining limits.
- **Affected Files**: `infra/docker-compose.yml`, `infra/docker-compose.dev.yml`, `backend/src/index.js` (connection retry/health semantics)
- **UI/Frontend Impact**: Indirect — slowness and 5xx errors with no operator-visible cause.
- **Security/Data Risk**: **Medium–High (operational).** Unbounded resource use turns any single bug into a platform-wide outage; committed credentials mean any repository read (or a leaked clone) hands over database access; unbounded logs are a disk-exhaustion vector and an open-ended retention surface if logs ever contain request bodies.
- **Steps to Reproduce**: Stop Redis or Postgres and observe that nothing in compose reacts; run a CPU-bound request loop and watch the host saturate; `git grep POSTGRES` inside the compose file for the inline credential.
- **Suggested Fix / Implementation Plan**: Add `mem_limit`/`cpus` (or a real `deploy.resources` block) per service, `healthcheck` for every long-running service plus `depends_on` conditions, move secrets to a git-ignored `env_file` or Docker secrets with a documented rotation, and set `logging: { driver: json-file, options: { max-size: '10m', max-file: '3' } }`. Add a CI check that fails when a secret-looking value appears in a committed compose file, and confirm log statements never include request bodies (ties to AUTH-016).
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Resource limits per service
  - [ ] Healthchecks + `depends_on` conditions for all services
  - [ ] Secrets out of the compose file (env_file/secrets + rotation)
  - [ ] Log driver with size/rotation limits
  - [ ] CI check for committed credentials
  - [ ] Confirm no PHI/PII is written to container logs

---

## Notes (lower priority, not itemised as findings)

- `infra/docker-compose.dev.yml` and `infra/docker-compose.yml` duplicate the same services with divergent settings — a fix applied to one can silently miss the other. Prefer one base file plus environment overrides.
- Large binaries are committed: `infra/valhalla/tiles/*.osm.pbf`, the whole `infra/valhalla/valhalla_tiles/**/*.gph` tree, and `infra/flink-lib/flink-sql-connector-kafka-3.0.2-1.18.jar`. These bloat the repository and place unreviewable artefacts in the build path; move them to an init/fetch step and commit only checksums.
- `infra/rust-telemetry/` emits telemetry but no compose service scrapes it and no dashboards or alert rules are declared. Either wire it to a metrics store with alert thresholds (including the `MISS-AUTHZ-004` denial-spike alert) or retire it — an unused telemetry pipeline invites false confidence.
- `infra/livekit/livekit.yaml` exists for the video service; confirm its keys/TURN configuration are externalised the same way as the other secrets rather than committed, and that `routes/video.js` (which has no role guard — see `AUTHZ-001`) authorises room joins server-side rather than trusting the client's room name.

<!-- END -->
