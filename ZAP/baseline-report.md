# OWASP ZAP Baseline Scan Status & Execution Report

## Overview
- **Target Application:** Findmedi HMS API & Web Platform
- **Scanner:** OWASP ZAP (ZED Attack Proxy) 2.15+
- **Scan Policy:** Baseline Scan with Healthcare API Context

## Execution Standard

```bash
docker run --rm -v $(pwd)/ZAP:/zap/wrk/:rw \
  -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t http://host.docker.internal:5000 \
  -r baseline-report.html \
  -w baseline-report.md \
  -m 5 \
  -I
```

## Baseline Rule Review & Hardening Status

| Rule ID | Name | Current Status | Mitigation / Note |
|---|---|---|---|
| 10020 | Anti-CSRF Tokens | Mitigated | SameSite=Lax/Strict cookies + Authorization Bearer JWT on mutating endpoints |
| 10021 | X-Content-Type-Options | Clean | Helmet middleware injects `nosniff` header |
| 10038 | Content Security Policy (CSP) | Clean | Strict CSP header configured in Helmet middleware |
| 10054 | Cookie Without SameSite | Clean | All session & refresh tokens enforce `SameSite=Strict; Secure; HttpOnly` |
| 40012 | Cross-Domain Script Inclusion | Clean | Strict CORS allowlist with regex origin matching in `backend/src/config/cors.js` |
| 90022 | Application Error Disclosure | Clean | Global error boundary sanitizes stack traces in production (`NODE_ENV=production`) |

## Sign-Off Gate
- [x] High Vulnerabilities: 0
- [x] Critical Vulnerabilities: 0
- [x] Medium Vulnerabilities: 0 (All addressed via security middleware)
