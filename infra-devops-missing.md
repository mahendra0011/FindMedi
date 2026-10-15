# Infra & DevOps — Missing Features & Capabilities

## [INFRA-MISSING-01] Egress Firewall & Metadata Service (IMDSv2) SSRF Shield
- **Description**: The backend Node.js container runs without strict outbound egress network filtering. If an SSRF (Server-Side Request Forgery) vulnerability is triggered (e.g. in `pdfService` downloading remote image signatures or webhook dispatch), the application can fetch internal network endpoints or cloud metadata IP (`http://169.254.169.254/latest/meta-data/`) to steal IAM roles and cloud keys.
- **Current vs Expected Behavior**:
  - *Current*: Container can make unrestricted outbound HTTP requests to internal IP ranges (`10.0.0.0/8`, `192.168.0.0/16`, `127.0.0.1`, `169.254.169.254`).
  - *Expected*: 
    1. Container-level egress firewall (iptables / Kubernetes NetworkPolicy) blocking outbound traffic to private RFC 1918 subnets and cloud metadata IP.
    2. Mandatory `safeFetch()` helper (implemented with DNS resolution check before socket connection) rejecting private/loopback IP connections.
- **Flow**: Remote image loading, PDF bill generation, webhook callbacks.
- **Root Cause / Logic**: SSRF prevention was not enforced at network egress level.
- **Affected Files**: `infra/docker-compose.yml`, `infra/k8s/`, `backend/src/services/pdfService.js`
- **UI/Frontend Impact**: None directly.
- **Security/Data Risk**: **Critical**. Cloud account takeover and internal microservice compromise via SSRF.
- **Suggested Fix / Implementation Plan**:
  1. Implement `safeFetch` in `backend/src/utils/safeFetch.js`.
  2. Add Kubernetes NetworkPolicy / Docker network isolating API containers from internal admin ports.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Implement `safeFetch.js` blocking private IPs.
  - [ ] Update `pdfService.js` to use `safeFetch`.

---

## [INFRA-MISSING-02] DNS Security Records (SPF, DKIM, DMARC `p=reject`, CAA)
- **Description**: Public DNS zones for `findmedi.online` / `findmedi.in` lack enforced DMARC reject policies and CAA (Certificate Authority Authorization) records, allowing email spoofers to send phishing emails posing as FindMedi doctors or billing departments.
- **Current vs Expected Behavior**:
  - *Current*: Missing or permissive DMARC (`p=none`).
  - *Expected*: Strict anti-spoofing DNS records:
    - SPF: `v=spf1 include:spf.brevo.com -all`
    - DMARC: `v=DMARC1; p=reject; rua=mailto:dmarc@findmedi.online; adkim=s; aspf=s`
    - CAA: `0 issue "letsencrypt.org"`
- **Flow**: Transactional email delivery (prescriptions, invoices, password resets).
- **Root Cause / Logic**: DNS configuration was managed ad-hoc.
- **Affected Files**: `docs/dns-records.md`, `infra/nginx/`
- **UI/Frontend Impact**: Emails delivered directly to Inbox with verified green checkmark rather than Spam folder.
- **Security/Data Risk**: **High**. Phishing attacks exploiting FindMedi domain name to defraud patients.
- **Suggested Fix / Implementation Plan**:
  1. Publish DMARC `p=reject` in authoritative DNS.
  2. Add CAA record restricting SSL issuance to Let's Encrypt.
- **Priority**: High
- **Phase**: Phase 0
- **TODOs**:
  - [ ] Document exact DNS records in `docs/dns-records.md`.
  - [ ] Verify DMARC compliance via DKIM validator.
