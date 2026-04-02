@echo off
title Vital Dental - Clinic Manager
color 0B
echo.
echo  ============================================
echo   Vital Dental -- Starting...
echo  ============================================
echo.

REM ── Fix PowerShell execution policy for npm ───────────────────────────────
powershell -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force" >nul 2>&1

REM ── Check node_modules ────────────────────────────────────────────────────
if not exist "frontend\node_modules" (
    echo  node_modules not found. Installing npm packages...
    cd frontend
    call npm install
    cd ..
)

REM ── Start Backend ─────────────────────────────────────────────────────────
echo  Starting FastAPI backend on port 8000...
start "Vital Dental - Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

REM ── Wait for backend to initialize ────────────────────────────────────────
timeout /t 3 /nobreak >nul

REM ── Start Frontend ────────────────────────────────────────────────────────
echo  Starting React frontend on port 3000...
start "Vital Dental - Frontend" cmd /k "cd /d %~dp0frontend && set PORT=3000 && npm start"

REM ── Wait then open browser ────────────────────────────────────────────────
echo.
echo  Waiting for servers to start (about 10 seconds)...
timeout /t 10 /nobreak >nul

echo  Opening dashboard in browser...
start http://localhost:3000

echo.
echo  ============================================
echo   Vital Dental is running!
echo  ============================================
echo   Dashboard : http://localhost:3000
echo   API Docs  : http://localhost:8000/docs
echo  ============================================
echo.
echo  Close the Backend and Frontend windows to stop.
pause
