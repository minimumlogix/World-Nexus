@echo off
:: =============================================
::   WORLD NEXUS - Validate Project
:: =============================================

cd /d "%~dp0"

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not installed or not in the PATH.
    pause
    exit /b 1
)

echo Running project validation...
echo.

node validate.mjs

if %ERRORLEVEL% equ 0 (
    echo.
    echo  [PASS] No issues found.
) else (
    echo.
    echo  [FAIL] Validation completed with issues. See above.
)

echo.
pause
