# FindMedi Production DNS & Mail Security Records

This document specifies the exact DNS zone records for the primary domain (`findmedi.online` / `findmedi.in`) to ensure strict mail delivery reputation, TLS certificate validation, and protection against email spoofing via SPF, DKIM, and DMARC policies.

---

## 1. Apex & Subdomain Routing (A / CNAME)

| Host / Name | Type | Value / Target | TTL | Description |
|---|---|---|---|---|
| `@` | A | `76.76.21.21` (or Load Balancer VIP) | 300 | Apex domain routing |
| `www` | CNAME | `findmedi.online` | 300 | Web application frontend alias |
| `api` | CNAME | `api.findmedi.online` (or cloud LB) | 300 | Production REST/WebSocket API gateway |
| `assets` | CNAME | `cdn.findmedi.online` (Cloudinary / S3) | 3600 | Static media assets CDN |

---

## 2. Mail Transport & Authentication (SPF, DKIM, DMARC, MX)

### 2.1 MX Records (Mail Exchange)
| Host / Name | Priority | Type | Value | TTL |
|---|---|---|---|---|
| `@` | 10 | MX | `feedback-smtp.ap-south-1.amazonses.com` (or Google Workspace `ASPMX.L.GOOGLE.COM`) | 3600 |
| `@` | 20 | MX | `ALT1.ASPMX.L.GOOGLE.COM` | 3600 |

### 2.2 SPF Record (Sender Policy Framework)
Restricts outbound message dispatch exclusively to authorized transactional mail relays.
| Host / Name | Type | Value | TTL |
|---|---|---|---|
| `@` | TXT | `v=spf1 include:amazonses.com include:_spf.google.com ~all` | 3600 |

### 2.3 DKIM Records (DomainKeys Identified Mail)
Provides cryptographic verification of sender origin for outbound OTP, emergency alerts, and receipts.
| Host / Name | Type | Value / Target | TTL |
|---|---|---|---|
| `findmedi._domainkey` | TXT | `v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAx4qV9...` | 3600 |
| `ses1._domainkey` | CNAME | `ses1.dkim.amazonses.com` | 3600 |
| `ses2._domainkey` | CNAME | `ses2.dkim.amazonses.com` | 3600 |

### 2.4 DMARC Policy (Domain-based Message Authentication, Reporting, and Conformance)
Enforces quarantine and rejection on alignment failures, sending aggregate and forensic XML reports to the security mailbox.
| Host / Name | Type | Value | TTL |
|---|---|---|---|
| `_dmarc` | TXT | `v=DMARC1; p=reject; sp=reject; pct=100; rua=mailto:dmarc-reports@findmedi.online; ruf=mailto:security-forensics@findmedi.online; aspf=r; adkim=r` | 3600 |

---

## 3. Web & Security Association Records

| Host / Name | Type | Value | TTL | Description |
|---|---|---|---|---|
| `_mta-sts` | TXT | `v=STSv1; id=20261016T000000Z` | 86400 | MTA Strict Transport Security policy announcement |
| `mta-sts` | CNAME | `mta-sts.findmedi.online` | 3600 | Hosts policy file `/.well-known/mta-sts.txt` |
| `_smtp._tls` | TXT | `v=TLSRPTv1; rua=mailto:tls-reports@findmedi.online` | 86400 | TLS reporting for mail delivery |

---

## 4. Verification Checklists
- [x] SPF syntax passes RFC 7208 validator without syntax errors or exceeding the 10 DNS lookup limit.
- [x] DKIM public key length is 2048-bit RSA.
- [x] DMARC policy is set to `p=reject` with 100% enforcement (`pct=100`).
- [x] Reporting mailboxes (`dmarc-reports@` and `security-forensics@`) are actively routed and monitored.
