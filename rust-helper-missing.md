# Rust Helper & Telemetry — Missing Features & Capabilities

## [RUST-MISSING-01] Hardware-Accelerated ChaCha20-Poly1305 / AES-NI Field Encryption in Rust NAPI
- **Description**: While Node.js native `node:crypto` provides software AES, high-throughput batch encryption of hundreds of thousands of historical medical records during database migrations or high-volume PDF export generates substantial CPU overhead in the single-threaded Node.js event loop.
- **Current vs Expected Behavior**:
  - *Current*: Field encryption runs via Node.js JavaScript bindings.
  - *Expected*: Rust NAPI function `medi_core_encrypt_phi_batch` utilizing SIMD and CPU AES-NI hardware instructions to encrypt/decrypt records in background worker threads without blocking Node.js event loop.
- **Flow**: High-volume clinical records export, background database migration, batch PDF generation.
- **Root Cause / Logic**: Native Rust acceleration was only implemented for PDF rendering and image resizing.
- **Affected Files**: `backend/rust-helper/src/lib.rs`, `backend/src/services/napiPdfService.js`
- **UI/Frontend Impact**: 5x faster generation of medical records export PDFs.
- **Security/Data Risk**: **Low**. Performance and throughput enhancement.
- **Suggested Fix / Implementation Plan**:
  1. Add `aes-gcm` or `chacha20poly1305` crate in `backend/rust-helper/Cargo.toml`.
  2. Expose `#[napi] pub fn encrypt_fields_batch(...) -> Vec<String>` in `lib.rs`.
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add AES-GCM crate to Cargo.toml.
  - [ ] Implement batch encryption in Rust helper.
