@echo off
setlocal enabledelayedexpansion

:: Check if node is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not installed or not in the PATH.
    echo Please install Node.js to run this script.
    pause
    exit /b 1
)

echo Running world and character sync script...
node "%~dp0update_worlds.js"

if %ERRORLEVEL% equ 0 (
    echo Sync completed successfully!
) else (
    echo Sync failed with error code %ERRORLEVEL%.
)

pause
