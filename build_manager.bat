@echo off
:: =============================================
::   WORLD NEXUS - Build and Update Manager Exe
:: =============================================

setlocal enabledelayedexpansion

cd /d "%~dp0"

:: 1. Add Cargo and MinGW64 GCC to the session PATH
set "PATH=C:\Users\Stult\.cargo\bin;C:\msys64\mingw64\bin;%PATH%"
:: Avoid parallel thread file lock conflicts on Windows
set CARGO_BUILD_JOBS=2

echo [INFO] Checking system prerequisites...

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [FAIL] Error: Node.js is not installed or not in the PATH.
    echo Please install Node.js from https://nodejs.org/
    goto :end_fail
)

:: Check Cargo
where cargo >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [FAIL] Error: Rust (cargo) is not installed or not in the PATH.
    echo Please install Rust from https://rustup.rs/
    goto :end_fail
)

:: Check windres (required for Windows resource compilation on GNU toolchains)
where windres >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [WARN] Warning: 'windres' was not found in the PATH.
    echo        If you are using the GNU Rust toolchain, the build will fail without MinGW/MSYS2 tools.
)

:: 2. Close any running instances of the manager to prevent lock errors
echo [INFO] Checking for running instances of World Nexus Manager...
tasklist /fi "imagename eq World Nexus Manager.exe" | find /i "World Nexus Manager.exe" >nul
if %ERRORLEVEL% equ 0 (
    echo [WARN] World Nexus Manager.exe is currently running.
    echo [INFO] Attempting to close running instance to avoid file locks...
    taskkill /f /im "World Nexus Manager.exe" >nul
    timeout /t 2 >nul
)

:: 3. Navigate to the manager directory
cd tools\wn-manager

:: 4. Check if node_modules exists, if not install them
if not exist "node_modules" (
    echo [INFO] Installing frontend dependencies...
    call npm install
)

:: Remove existing root executable first to ensure clean state
if exist "..\..\World Nexus Manager.exe" (
    del "..\..\World Nexus Manager.exe" >nul 2>nul
)

:: 5. Build the Tauri application in release mode
echo.
echo [INFO] Building World Nexus Manager in release mode...
call npx tauri build

:: 6. If build succeeds, update the root executable
if %ERRORLEVEL% equ 0 (
    echo.
    echo [PASS] Build completed successfully!
    echo [INFO] Updating the root executable...
    
    if exist "src-tauri\target\release\wn-manager.exe" (
        copy /y "src-tauri\target\release\wn-manager.exe" "..\..\World Nexus Manager.exe" >nul
        if %ERRORLEVEL% equ 0 (
            echo [PASS] World Nexus Manager.exe updated successfully at the project root!
            goto :end_success
        ) else (
            echo [FAIL] Error copying the executable. It might still be locked.
        )
    ) else (
        echo [FAIL] Compiled executable was not found in: src-tauri\target\release\wn-manager.exe
    )
) else (
    echo.
    echo [FAIL] Build failed. Please check the logs above for details.
)

:end_fail
echo.
echo Build process ended with failure.
pause
exit /b 1

:end_success
echo.
echo Build process finished successfully.
pause
exit /b 0
