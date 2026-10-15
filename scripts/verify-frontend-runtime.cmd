@echo off
setlocal
cd /d "%~dp0..\frontend"

where npm >nul 2>&1
if errorlevel 1 (
  echo [WarrantyOS] ERROR: npm is not available on PATH.
  exit /b 1
)

if not exist node_modules (
  echo [WarrantyOS] Installing frontend dependencies...
  call npm install --no-audit --no-fund
  if errorlevel 1 exit /b 1
)

echo [WarrantyOS] Running Vite production build...
call npm run build
if errorlevel 1 (
  echo [WarrantyOS] FRONTEND BUILD FAILED.
  exit /b 1
)

echo [WarrantyOS] Frontend build passed.
exit /b 0
