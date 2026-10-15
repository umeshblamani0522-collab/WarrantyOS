@echo off
setlocal enabledelayedexpansion
for /l %%i in (1,1,90) do (
  powershell -NoProfile -Command "try { $r=Test-NetConnection -ComputerName localhost -Port 8080 -WarningAction SilentlyContinue; if($r.TcpTestSucceeded){exit 0}else{exit 1} } catch { exit 1 }" >nul 2>&1
  if not errorlevel 1 (
    echo [WarrantyOS] Backend is listening on port 8080.
    exit /b 0
  )
  timeout /t 2 /nobreak >nul
)
echo [WarrantyOS] WARNING: Backend did not open port 8080 within 180 seconds.
echo [WarrantyOS] The backend terminal contains the actual error, if any.
exit /b 1
