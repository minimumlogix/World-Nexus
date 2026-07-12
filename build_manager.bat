@echo off
:: =============================================
::   WORLD NEXUS - Build and Update Manager Exe
:: =============================================

cd /d "%~dp0"

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not installed or not in the PATH.
    pause
    exit /b 1
)

:: 1. Add Cargo and MinGW64 GCC to the session PATH
set "PATH=C:\Users\Stult\.cargo\bin;C:\msys64\mingw64\bin;%PATH%"

:: Avoid parallel thread file lock conflicts on Windows
set CARGO_BUILD_JOBS=2

:: 2. Navigate to the manager directory
cd tools\wn-manager

:: 3. Check if node_modules exists, if not install them
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

:: 4. Build the Tauri application in release mode
echo.
echo Building World Nexus Manager in release mode...
call npx tauri build

:: 5. If build succeeds, update the root executable
if %ERRORLEVEL% equ 0 (
    echo.
    echo Build completed successfully!
    echo.
    echo Updating the root executable...
    
    if exist "src-tauri\target\release\wn-manager.exe" (
        copy /y "src-tauri\target\release\wn-manager.exe" "..\..\World Nexus Manager.exe" >nul
        if %ERRORLEVEL% equ 0 (
            echo  [PASS] World Nexus Manager.exe updated successfully at the project root!
        ) else (
            echo  [FAIL] Error copying the executable. It might be currently running or locked.
        )
    ) else (
        echo  [FAIL] Compiled executable was not found in the release target directory.
    )
) else (
    echo.
    echo  [FAIL] Build failed. Please check the logs above for details.
)

echo.
pause
