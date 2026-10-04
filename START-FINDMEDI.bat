@echo off
REM ===========================================================================
REM  FindMedi - ONE CLICK STARTER
REM
REM  Double-click this file. It will:
REM    1. verify Node.js 20+ is installed
REM    2. install dependencies (first run only - skipped once node_modules exist)
REM    3. start Docker infra + backend + frontend via `npm run start:all`
REM    4. open http://localhost:5173 in your browser automatically when ready
REM
REM  Keep this window OPEN while working. Press Ctrl+C to stop the dev servers.
REM  Docker containers keep running after you close it - stop them with
REM  `npm run infra:down`.
REM ===========================================================================

setlocal
cd /d "%~dp0"
title FindMedi - one click starter

echo.
echo  ============================================================
echo    FindMedi - one click starter
echo  ============================================================
echo.

REM --- 1. Node.js check ------------------------------------------------------
where node >nul 2>&1
if errorlevel 1 (
  echo  [X] Node.js was not found on your PATH.
  echo      Install Node.js 20 or newer from https://nodejs.org
  echo      then double-click this file again.
  echo.
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODEV=%%v
echo  [1/4] Node.js %NODEV% detected.

REM --- 2. Dependencies -------------------------------------------------------
REM Only install when something is actually missing, so a normal double-click
REM starts in seconds instead of re-resolving the whole tree every time.
set NEEDS_INSTALL=
if not exist "node_modules\concurrently" set NEEDS_INSTALL=1
if not exist "backend\node_modules" set NEEDS_INSTALL=1
if not exist "frontend\node_modules" set NEEDS_INSTALL=1

if defined NEEDS_INSTALL (
  echo  [2/4] Installing dependencies ^(first run - this takes a few minutes^)...
  call npm install
  if errorlevel 1 (
    echo.
    echo  [X] npm install failed. Scroll up for the error.
    echo.
    pause
    exit /b 1
  )
) else (
  echo  [2/4] Dependencies already installed.
)

REM --- 3. Browser watcher ----------------------------------------------------
REM Runs detached so the real startup keeps this terminal. It polls the API
REM health endpoint and the Vite port, then opens the browser once both answer.
start "" /b node scripts\open-when-ready.mjs

REM --- 4. Start everything ---------------------------------------------------
echo  [3/4] Starting Docker infra, backend and frontend...
echo.
echo  Browser will open automatically once the app is ready.
echo  Keep this window open. Press Ctrl+C to stop the dev servers.
echo.
call npm run start:all

echo.
echo  ============================================================
echo    FindMedi stopped.
echo    Containers are still running - stop them with: npm run infra:down
echo  ============================================================
echo.
pause
endlocal
