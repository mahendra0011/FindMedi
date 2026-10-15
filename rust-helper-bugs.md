# Rust Helper & Telemetry — Bugs

## [RUST-BUG-01] Decompression Bomb Vulnerability in Native Image Resizing
- **Description**: In `backend/rust-helper/src/lib.rs` line 59, the native image processing function decodes incoming image buffers via `image::io::Reader` without limiting the decoded pixel dimensions.
- **Current vs Expected Behavior**:
  - *Current*: An attacker can upload a 100 KB "zip-bomb" PNG image with headers stating dimensions of 50,000 x 50,000 pixels. When `image::load_from_memory` runs, Rust attempts to allocate ~10 GB of uncompressed pixel buffer in memory, crashing the native NAPI worker.
  - *Expected*: Set `reader.limits(Limits::default().max_image_dimensions(Some((8192, 8192))))` before decoding.
- **Flow**: Patient prescription photo upload, doctor profile photo upload.
- **Root Cause / Logic**: Default `image-rs` reader configuration without dimension bounds.
- **Affected Files**: `backend/rust-helper/src/lib.rs:59-120`
- **UI/Frontend Impact**: Image upload hangs or returns 500 error.
- **Security/Data Risk**: **High**. Denial of Service (DoS) and Out-Of-Memory (OOM) crash of the entire Node.js server.
- **Steps to Reproduce**:
  1. Generate a 10000x10000 compressed PNG image.
  2. Upload via native image optimization route.
  3. Node.js process crashes due to native allocation panic.
- **Suggested Fix / Implementation Plan**:
  1. Configure `Limits::default().max_image_width(8192).max_image_height(8192)` in `rust-helper/src/lib.rs`.
- **Priority**: High
- **Phase**: Phase 0
- **TODOs**:
  - [x] Add pixel dimension limit in `rust-helper/src/lib.rs`.
  - [x] Rebuild NAPI binary with `npm run build:rust`.
