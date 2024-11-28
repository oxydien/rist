@echo off
setlocal enabledelayedexpansion

:: Check if script is run from project root
if not exist "frontend\" (
    echo ERROR: Script must be run from project root directory
    exit /b 1
)

:: Frontend package manager detection and build
set "PACKAGE_MANAGER="
if exist "frontend\package.json" (
    where bun >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        set "PACKAGE_MANAGER=bun"
    ) else (
        where npm >nul 2>nul
        if %ERRORLEVEL% equ 0 (
            set "PACKAGE_MANAGER=npm"
        ) else (
            where yarn >nul 2>nul
            if %ERRORLEVEL% equ 0 (
                set "PACKAGE_MANAGER=yarn"
            )
        )
    )
)

if not defined PACKAGE_MANAGER (
    echo ERROR: No package manager found. Install bun, npm, or yarn.
    exit /b 1
)

:: Build frontend
cd frontend
echo INFO: Using !PACKAGE_MANAGER! for frontend build
!PACKAGE_MANAGER! install
if %ERRORLEVEL% neq 0 (
    echo ERROR: Frontend dependency installation failed
    exit /b 1
)

!PACKAGE_MANAGER! run build
if %ERRORLEVEL% neq 0 (
    echo ERROR: Frontend build failed
    exit /b 1
)
cd ..

:: Backend build
where cargo >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Rust (cargo) not installed
    exit /b 1
)

cargo build --release
if %ERRORLEVEL% neq 0 (
    echo ERROR: Backend build failed
    exit /b 1
)

:: Copy frontend to backend
rmdir /S /Q "target\release\frontend"
mkdir "target\release\frontend" 2>nul
xcopy /E /I /Y "frontend\dist\*" "target\release\frontend"
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to copy frontend build
    exit /b 1
)

echo BUILD COMPLETE: Frontend and backend successfully built
