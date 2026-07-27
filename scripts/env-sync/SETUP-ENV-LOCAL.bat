@echo off
REM webbetonglammau - Module 1 launcher (auto Administrator)
REM Flow: Local PowerShell -> Webhook Make/n8n -> Vercel API (NO Elmony)

setlocal
cd /d "%~dp0"

echo.
echo  ============================================
echo   ENV SYNC - webbetonglammau
echo   Dang xin quyen Administrator...
echo  ============================================
echo.

net session >nul 2>&1
if %errorlevel% neq 0 (
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0SETUP-ENV-LOCAL.ps1" %*
set ERR=%ERRORLEVEL%

if %ERR% neq 0 (
  echo.
  echo  [LOI] Script thoat voi ma %ERR%
  pause
  exit /b %ERR%
)

endlocal
exit /b 0
