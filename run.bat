@echo off
title GraphFlow-Universal Dashboard

:: Navigate to root directory of script
cd /d "%~dp0"

echo ======================================================================
echo          GraphFlow-Universal: Architecture and Flow Explorer
echo ======================================================================
echo.

:: 1. Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Check dependencies
if not exist "node_modules\" (
    echo [SETUP] First-time setup: Installing required dependencies...
    call npm.cmd install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install npm dependencies.
        pause
        exit /b 1
    )
    echo [SETUP] Dependencies successfully installed.
    echo.
)

:: 3. Launch browser in background after short delay
echo [LAUNCHER] Opening web dashboard in default browser...
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:5180"

:: 4. Start Backend Server (port 3001) and Frontend Vite (port 5180)
echo [SERVERS] Launching Backend API on Port 3001 and Frontend on Port 5180...
echo [ACCESS] Web Dashboard: http://localhost:5180
echo [ACCESS] Backend API:   http://localhost:3001/api/status
echo.
echo Press Ctrl+C at any time to stop the servers.
echo ======================================================================
echo.

call npm.cmd start
pause
