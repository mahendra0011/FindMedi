# GST E-Invoicing (IRN) Architecture & Legal Guidelines

**Applicable Spec:** GSTN E-Invoice Schema v1.1  
**Module:** `backend/src/services/einvoiceService.js`  
**API Routes:** `/api/billing/:id/einvoice`, `/api/billing/:id/einvoice/cancel`  

---

## 1. Statutory Background & Mandate

### 1.1 Turnover Threshold
Under Rule 48(4) of the CGST Rules, 2017, e-invoicing is mandatory for all registered taxpayers whose aggregate annual turnover (AATO) in any preceding financial year from 2017-18 onwards exceeds **₹5 Crore** (effective August 1, 2023).

### 1.2 Healthcare Applicability & Taxability Matrix
While core healthcare services are largely exempt under GST, hospitals and healthcare chains frequently trigger e-invoicing obligations:

| Service / Supply Category | SAC / HSN Code | GST Rate | E-Invoicing Applicable? | Notes |
|:---|:---|:---:|:---:|:---|
| **Clinical diagnosis, treatment & care** | SAC 999312 / 999316 | 0% (Exempt) | Exempt Supplies | Notification 12/2017-CT(Rate) entry 74. If billing B2B entity, exempt invoice reporting applies. |
| **Hospital Room Rent (> ₹5,000/day)** | SAC 999311 | 5% (without ITC) | **MANDATORY (B2B)** | Notification 04/2022-CT(Rate), excluding ICU/CCU/ICCU/NICU. |
| **Cosmetic / Aesthetic Procedures** | SAC 999312 | 18% | **MANDATORY (B2B)** | Non-reconstructive plastic surgery or aesthetics is fully taxable. |
| **Institutional / Corporate TPA Invoices** | SAC 9993 | Variable | **MANDATORY (B2B)** | Invoices raised directly to corporate insurance TPAs or employers holding GSTIN. |
| **Inpatient / Outpatient Pharmacy Retail** | HSN Chapter 30 | 5% / 12% / 18% | **MANDATORY (B2B)** | Sale of medicines and medical consumables to corporate buyers or inter-hospital transfers. |

---

## 2. Technical Architecture & NIC Integration

### 2.1 Modes of Operation
Findmedi supports dual operating modes via `EINVOICE_MODE`:
- **`sandbox`**: Uses NIC testbed (`https://devapi.gst.gov.in/einvoice/v1.0`). Generates deterministic 64-character hex IRNs and simulated signed QR payloads without touching live tax ledgers.
- **`live`**: Uses production NIC IRP gateway (`https://api.einvoice.gov.in/einvoice/v1.0`). Requires production GSTIN API credentials registered on the e-Invoice portal.

### 2.2 Network Resilience & Timeouts
To ensure hospital billing desks are never blocked during NIC IRP downtime or network degradation:
- Calls to `/auth`, `/invoice`, and `/invoice/cancel` employ strict **20-second timeouts** (`AbortSignal.timeout(20000)`).
- Transient network failures (e.g. `ECONNRESET`, socket timeouts) trigger **automatic 1-attempt retry** with exponential backoff before failing closed.
- Responses return distinct error codes (`E-INVOICE_NOT_CONFIGURED`, `AUTH_FAILED`, `NETWORK_ERROR`, `CANCEL_WINDOW_EXPIRED`) to empower front-desk resolution.

### 2.3 24-Hour Cancellation Window
Per GSTN statutory rules:
- An IRN can **only be cancelled within 24 hours** of its generation on the IRP.
- If cancellation is attempted past 24 hours, the IRP rejects the request. Findmedi enforces this boundary strictly; past 24 hours, the hospital billing department must issue a **Credit Note (GSTR-1)** rather than cancelling the IRN.

---

## 3. Environment Configuration

The following variables must be configured in `backend/.env` for live operations:

```env
EINVOICE_MODE=live
EINVOICE_GSTIN=27AAPFU0939F1ZV
EINVOICE_USERNAME=nic_portal_user
EINVOICE_PASSWORD=nic_portal_password
EINVOICE_CLIENT_ID=nic_api_client_id
EINVOICE_CLIENT_SECRET=nic_api_client_secret
EINVOICE_BASE_URL=https://api.einvoice.gov.in/einvoice/v1.0
```

> [!NOTE]
> When `EINVOICE_GSTIN` or `EINVOICE_USERNAME` is unset, the e-invoicing service gracefully reports `E-INVOICE_NOT_CONFIGURED` without failing billing generation.
