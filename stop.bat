@echo off
title Vital Dental - Stop
color 0C
echo.
echo  Stopping Vital Dental servers...

REM Kill processes on port 8000 (backend)
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000"') do taskkill /F /PID %%a >nul 2>&1

REM Kill processes on port 3000 (frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000"') do taskkill /F /PID %%a >nul 2>&1

echo  All servers stopped.
timeout /t 2 /nobreak >nul
