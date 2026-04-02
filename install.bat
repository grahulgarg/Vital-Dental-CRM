@echo off
title Vital Dental - Install Dependencies
color 0A
echo.
echo  ============================================
echo   Vital Dental -- First-Time Setup
echo  ============================================
echo.

REM ── Check Python ──────────────────────────────────────────────────────────
echo [1/3] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Python not found. Please install Python 3.9+ from https://python.org
    pause
    exit /b 1
)
python --version
echo  OK

REM ── Install Python packages ───────────────────────────────────────────────
echo.
echo [2/3] Installing Python packages...
pip install -r backend\requirements.txt
if errorlevel 1 (
    echo  ERROR: Failed to install Python packages.
    pause
    exit /b 1
)
echo  OK

REM ── Install Node packages ─────────────────────────────────────────────────
echo.
echo [3/3] Installing Node.js packages (this may take 1-2 minutes)...
if not exist "frontend\node_modules" (
    cd frontend
    npm install
    cd ..
) else (
    echo  Already installed, skipping.
)
echo  OK

REM ── Copy .env.example if needed ───────────────────────────────────────────
if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env" >nul
    echo.
    echo  NOTE: Created backend\.env from template.
    echo  Edit it to add your Twilio and Google Review credentials.
)

echo.
echo  ============================================
echo   Setup complete! Run start.bat to launch.
echo  ============================================
echo.
pause
