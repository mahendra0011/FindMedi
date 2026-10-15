# Infra & DevOps — Bugs

## [INFRA-BUG-01] bfcache / Back-Button Medical Data Leak in Nginx Cache Configuration
- **Description**: In `infra/nginx/snippets/findmedi-proxy-locations.conf` line 104, the `location = /index.html` block sets:
  `add_header Cache-Control "no-cache, must-revalidate";`
- **Current vs Expected Behavior**:
  - *Current*: `no-cache` allows modern browsers (Chrome, Safari, Edge) to cache the rendered DOM and sensitive medical state in bfcache (Back-Forward Cache). If a patient or clinic receptionist clicks "Logout" in a shared clinic terminal, and a subsequent user clicks the browser's "Back" button, the previously rendered patient charts and prescriptions are displayed from bfcache!
  - *Expected*: Must enforce `add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0" always;` and `add_header Pragma "no-cache" always;` on HTML documents and API responses, combined with a `pageshow` listener in frontend clearing DOM if `event.persisted` is true.
- **Flow**: User logout on shared computer (OPD desk, cyber cafe, library).
- **Root Cause / Logic**: Incomplete cache-control directive on SPA entry point.
- **Affected Files**: `infra/nginx/snippets/findmedi-proxy-locations.conf:104`, `frontend/src/App.tsx`
- **UI/Frontend Impact**: None during normal navigation; blocks back-button inspection after logout.
- **Security/Data Risk**: **High**. Physical data leak of confidential medical records to unauthorized subsequent users on shared devices.
- **Steps to Reproduce**:
  1. Open FindMedi, log in as patient, view prescription.
  2. Click Logout.
  3. Click Browser Back button.
  4. Notice previous page and patient data reloaded from browser bfcache.
- **Suggested Fix / Implementation Plan**:
  1. In `findmedi-proxy-locations.conf:104`, update to:
     `add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0" always;`
  2. Add `window.addEventListener('pageshow', (e) => { if (e.persisted) window.location.reload(); });` in `App.tsx`.
- **Priority**: High
- **Phase**: Phase 0
- **TODOs**:
  - [ ] Update `findmedi-proxy-locations.conf` Cache-Control header.
  - [ ] Add `pageshow` reload listener in frontend.

---

## [INFRA-BUG-02] Incomplete Frontend CSP Directives Allowing Script Injection
- **Description**: In `infra/nginx/nginx.conf` line 114, the Content-Security-Policy header specifies:
  `add_header Content-Security-Policy "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" always;`
  It completely omits `script-src`, `connect-src`, `style-src`, and `img-src` restrictions.
- **Current vs Expected Behavior**:
  - *Current*: Browser will execute scripts from ANY origin if injected via DOM injection, defeating CSP protection against XSS.
  - *Expected*: Strict CSP policy allowlisting only trusted endpoints:
    `default-src 'self'; script-src 'self' https://accounts.google.com https://cdn.jsdelivr.net; connect-src 'self' https://*.findmedi.online wss://*.findmedi.online https://api.maptiler.com https://res.cloudinary.com; img-src 'self' data: blob: https://res.cloudinary.com;`
- **Flow**: All browser page loads and asset rendering.
- **Root Cause / Logic**: Full CSP was commented as a handoff item due to fear of breaking map tiles and Google login.
- **Affected Files**: `infra/nginx/nginx.conf:114, 148`
- **UI/Frontend Impact**: None if properly allowlisted.
- **Security/Data Risk**: **High**. Weak CSP provides zero defense-in-depth against malicious injected scripts or malicious npm packages.
- **Steps to Reproduce**:
  1. Inspect network response headers in browser for `index.html`.
  2. Notice `Content-Security-Policy` has no `script-src` directive.
- **Suggested Fix / Implementation Plan**:
  1. Test and deploy comprehensive CSP in `nginx.conf` and `index.html`.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Expand CSP in `infra/nginx/nginx.conf`.
  - [ ] Verify Google Sign-In and MapTiler tiles load without CSP violation reports.
