# napi-core Build Guide

Native Rust modules for FindMedi's performance-critical paths (image resize, PDF generation, CSV parsing), exposed to Node.js via [`napi-rs`](https://napi.rs) (N-API, ABI-stable).

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Rust | 1.98.1+ | Install via [rustup](https://rustup.rs): `rustup install stable` |
| Node.js | 20.x+ | Already required by the server |
| npm/npx | 10.x+ | For `@napi-rs/cli` |

## Quick Start (Linux CI)

On Linux CI runners, the standard Rust toolchain works out of the box — no special flags needed:

```bash
cd server/napi-core
npx napi build --platform --dts index.d.ts
```

## Quick Start (Windows GNU target)

On Windows with the GNU target, additional setup is required due to:

1. **Windows Application Control (WDAC/AppLocker)** — blocks cargo-spawned build scripts (`build-script-build.exe`).
   - **Workaround**: Set `RUSTC_BOOTSTRAP=1` to allow direct rustc compilation with proc_macro access.
2. **dlltool.exe not found** — `link-self-contained=yes` calls dlltool to create import libraries for system DLLs, but the GNU dlltool has a `libwinpthread-1.dll` runtime dependency that `CreateProcessW` can't resolve.
   - **Workaround**: A Rust-compiled `dlltool.exe` replacement ([`src/dlltool_repl.rs`](./src/dlltool_repl.rs)) creates valid-but-empty COFF archives. Since `rust-lld` with `link-self-contained` resolves system DLL symbols directly, empty import libraries are sufficient.

### Build on Windows

```bash
cd server\napi-core
build.bat          # debug build
build.bat release  # optimized release (smaller binary)
```

Or manually:

```bash
set RUSTC_BOOTSTRAP=1
set DLLTOOL=%cd%\dlltool.exe
npx napi build --platform --dts index.d.ts --release
```

### `.cargo/config.toml`

On the GNU target, the linker is set to `rust-lld` with `link-self-contained=yes`:

```toml
[target.x86_64-pc-windows-gnu]
linker = "rust-lld"
rustflags = ["-C", "link-self-contained=yes"]
```

On the MSVC target, no special config is needed — it uses the system linker (`link.exe`).

## What napi build does

The `napi build` command:

1. Runs `cargo build` (or `cargo build --release`) to compile the Rust crate as a `cdylib`
2. Invokes `napi-bindgen` to link the N-API bindings and produce a `.node` file
3. Generates `index.js` (JS loader wrapper) and `index.d.ts` (TypeScript definitions)

The `index.js` wrapper is checked into git (modified from the napi-generated default to support the GNU target variant with MSVC fallback).

## CI/CD

The GitHub Actions workflow (`.github/workflows/ci.yml`) includes a `build-rust` job that:

- **Linux**: Standard Rust + napi build
- **Windows**: Sets up the GNU target with `RUSTC_BOOTSTRAP=1` and `DLLTOOL` env vars, then builds and tests

## Testing

```bash
cd server/napi-core
node test.js          # ffi-napi based test
node -e "require('./index.js')"  # napi-rs wrapper test
```

## Adding New Functions

1. Add `#[napi] pub fn ...` to [`src/lib.rs`](./src/lib.rs)
2. Rebuild: `build.bat release`
3. TypeScript types auto-generate in `index.d.ts`
