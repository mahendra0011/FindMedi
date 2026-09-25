# 24 - Automated PDF Invoices, Thermal Receipts & N-API Accelerated Generation Specification

## 1. Architectural Mandate
Every completed transaction across FindMedi requires instant, legally compliant tax documentation:
- **Riders**: Instant GST ride receipt with route map thumbnail and tax breakdown (`rideReceiptService.js`).
- **Legal Consultations**: Advocate fee memo and Retainer receipt (`lawyerReceiptService.js`).
- **Home Healthcare Visits**: Nurse care summary and bill receipt (`assistantReceiptService.js`).
- **Hospital Admissions / Lab Tests**: Comprehensive hospital IPD/OPD invoice with pharmacy items and bed charges (`billPdfService.js`).

---

## 2. Generation Engine Architecture (Node.js + N-API Native C++ / Rust)

```
                            TRANSACTION COMPLETED
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │    PDF GENERATION SERVICE     │
                      │  (PDFKit / N-API C++ Engine)  │
                      └───────────────┬───────────────┘
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                         ▼
   [ Vector PDF Invoice (A4) ]              [ ESC/POS Thermal Receipt (80mm) ]
   - High-res QR code for verification      - Optimized for Bluetooth receipt printers
   - Company GSTIN, HSN/SAC codes           - Carried by Drivers / Clinic reception
   - Stored in Cloudinary / MinIO           - Direct ESC/POS raw byte stream
                 │                                         │
                 ▼                                         ▼
   Emailed to Customer (Nodemailer)          Printed or downloaded on client device
```

---

## 3. High-Speed N-API Native Addon Integration (`napiPdfService.js`)
To avoid blocking the Node.js single-threaded event loop when generating thousands of complex PDF invoices simultaneously:
- High-volume PDF streaming utilizes native C++/Rust bindings via Node-API (`napiPdfService.js`).
- Offloads layout geometry calculation and image decompression to dedicated OS worker threads.

---

## 4. Invoice Regulatory & Tax Compliance Rules (India GST)
Every generated document must include:
1. **SAC Codes**: SAC 996412 (Taxi operation), SAC 998211 (Legal counsel), SAC 999312 (Nursing services).
2. **Dynamic Tax Breakdown**: CGST (9%) + SGST (9%) for intra-state services, or IGST (18%) for inter-state.
3. **Cryptographic Validation QR Code**: Contains an encoded digital signature hash verifying authenticity against FindMedi's public key ledger.
