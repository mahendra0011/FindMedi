# Pharmacy & Lab — Missing Features & Capabilities

## [PHARM-LAB-MISSING-01] CDSCO Schedule H / H1 & Narcotic Drug Sale Logging & Prescription Lock
- **Description**: Indian drug regulations (Drugs and Cosmetics Act, 1940 & Schedule H1 rules) require mandatory separate physical register records or cryptographic e-records for Schedule H1 antibiotics and narcotic/psychotropic drugs (date of supply, patient name/address, prescriber registration number, drug quantity, manufacturer batch number).
- **Current vs Expected Behavior**:
  - *Current*: Pharmacy orders dispense all medicines identically in `pharmacyDispenseService.js` without Schedule H/H1 tagging or prescription reuse invalidation.
  - *Expected*: If a prescription contains Schedule H1 medicines:
    1. System verifies registered doctor NMC number.
    2. Once dispensed, prescription is cryptographically locked ("DISPENSED" watermark) to prevent duplicate fills at another pharmacy.
    3. Sale is appended to an immutable Schedule H1 digital audit log.
- **Flow**: Dispensing controlled antibiotics or psychiatric medication.
- **Root Cause / Logic**: Pharmacy dispensing was implemented as standard e-commerce retail without CDSCO statutory medical regulation gates.
- **Affected Files**: `backend/src/models/Medicine.js`, `backend/src/services/pharmacyDispenseService.js`, `backend/src/routes/pharmacy.js`
- **UI/Frontend Impact**: Pharmacist POS screen shows Schedule H1 red warning badge requiring batch number entry before dispensing.
- **Security/Data Risk**: **High**. Regulatory non-compliance and drug abuse liability.
- **Suggested Fix / Implementation Plan**:
  1. Add `scheduleClass: { type: String, enum: ['OTC', 'Schedule_H', 'Schedule_H1', 'Schedule_X'], default: 'OTC' }` in `Medicine.js`.
  2. Implement prescription locking hook in `pharmacyDispenseService.js`.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Add `scheduleClass` to Medicine model.
  - [ ] Add prescription lock logic upon dispense completion.

---

## [PHARM-LAB-MISSING-02] Real-Time Bidirectional LIS Analyzer Driver (RS232 / TCP Socket Daemon)
- **Description**: While `astm.js` and `hl7.js` parse received strings, the physical hardware driver layer for establishing persistent TCP/IP listening ports or serial-to-ethernet bridge connections to hospital lab machines (e.g. Roche Cobas, Sysmex, Beckman Coulter) is only mocked via `/ingest/emulate`.
- **Current vs Expected Behavior**:
  - *Current*: Hospitals must use external third-party middleware to HTTP POST frames to FindMedi's API.
  - *Expected*: Built-in background TCP listener (`lisAnalyzerDriver.js`) or local edge-agent binary that connects directly to analyzer IP/port, handles ASTM handshake (ENQ -> ACK -> STX -> ETX -> EOT), and automatically pipes frames into `LabOrder`.
- **Flow**: High-volume hospital diagnostic lab automated testing.
- **Root Cause / Logic**: The edge serial/socket daemon was stubbed as an emulator in Phase 0.
- **Affected Files**: `backend/src/services/lisAnalyzerDriver.js`, `backend/src/routes/lab.js`
- **UI/Frontend Impact**: LIS dashboard live machine connection status indicator (Online / Offline / Ingesting).
- **Security/Data Risk**: **Medium**. Unencrypted TCP connections over local hospital networks without TLS tunneling.
- **Suggested Fix / Implementation Plan**:
  1. Implement TLS-wrapped TCP server socket in `lisAnalyzerDriver.js`.
  2. Support client certificate verification or IP allowlisting per analyzer.
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Implement TCP socket server in `lisAnalyzerDriver.js`.
  - [ ] Add analyzer connection heartbeat.
