@echo off
:: =============================================
::   WORLD NEXUS - Desktop Manager Runner
:: =============================================

echo Starting World Nexus Manager...

:: 1. Add Cargo and MinGW64 GCC to the session PATH
set "PATH=C:\Users\Stult\.cargo\bin;C:\msys64\mingw64\bin;%PATH%"

:: Avoid parallel thread file lock conflicts on Windows
set CARGO_BUILD_JOBS=2

:: 2. Navigate to the manager directory
cd /d "%~dp0tools\wn-manager"

:: 3. Check if node_modules exists, if not install them
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

:: 4. Launch Tauri in dev mode (opens the GUI window)
echo Launching GUI...
call npx tauri dev

pause
