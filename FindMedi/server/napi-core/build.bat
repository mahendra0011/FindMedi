@echo off
REM Build helper for the napi-rs native module on Windows.
REM
REM On systems with Windows Application Control (WDAC/AppLocker) policies
REM that block cargo build scripts, this sets RUSTC_BOOTSTRAP=1 to allow
REM direct rustc compilation with proc_macro access. The DLLTOOL env var
REM points to the dlltool.exe replacement (built from src/dlltool_repl.rs)
REM which creates empty COFF archives so rust-lld link-self-contained can
REM resolve system DLL symbols.
REM
REM Usage: build.bat [release]
REM   (no args  → debug build)
REM   release   → optimized release build (smaller binary)

setlocal

REM Locate Rust toolchain (cargo/rustc are on PATH from rustup)
where rustc >nul 2>nul
if errorlevel 1 (
    echo ERROR: rustc not found in PATH. Install Rust from https://rustup.rs
    exit /b 1
)

REM Enable rustc internal APIs that cargo build scripts need under App Control
set RUSTC_BOOTSTRAP=1

REM Point cargo/rustc to the dlltool.exe replacement for GNU target
set DLLTOOL=%~dp0dlltool.exe
set PATH=%~dp0;%PATH%

if "%~1"=="release" (
    echo Building napi-core in release mode...
    call npx napi build --platform --dts index.d.ts --release
) else (
    echo Building napi-core in debug mode...
    call npx napi build --platform --dts index.d.ts
)

if errorlevel 1 (
    echo ERROR: Build failed.
    exit /b 1
)

echo.
echo Build complete. Running quick test...
node test.js
if errorlevel 1 (
    echo ERROR: Tests failed.
    exit /b 1
)

echo.
echo All checks passed!
endlocal
