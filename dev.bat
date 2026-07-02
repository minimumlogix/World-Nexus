@echo off
:: =============================================
::   WORLD NEXUS - Start Dev Server
:: =============================================

cd /d "%~dp0"

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not installed or not in the PATH.
    pause
    exit /b 1
)

echo Starting World Nexus dev server...
echo Visit: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server.
echo.

node server.js

pause
