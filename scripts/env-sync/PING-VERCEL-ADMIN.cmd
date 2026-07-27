@echo off
:: =============================================================================
:: PHẦN 3B — Ping test endpoint admin sau khi Vercel Redeploy
:: Kỳ vọng: HTTP 401 (chưa login) hoặc 200 (đã có cookie) — KHÔNG phải 404/500
:: Lưu ý: /api/admin/all-data yêu cầu Bearer token → 401 = route SỐNG (thành công hạ tầng)
:: =============================================================================

setlocal EnableDelayedExpansion
cd /d "%~dp0"

set "SITE_URL=https://webbetonglammau.vercel.app"
if not "%~1"=="" set "SITE_URL=%~1"

set "ENDPOINT=%SITE_URL%/api/admin/all-data"

echo.
echo  ============================================
echo   PING TEST — webbetonglammau
echo   URL: %ENDPOINT%
echo  ============================================
echo.

:: Dùng curl.exe có sẵn trên Windows 10+
where curl.exe >nul 2>&1
if errorlevel 1 (
  echo  [LOI] Khong tim thay curl.exe
  exit /b 2
)

:: Gọi ẩn danh — kỳ vọng 401 Unauthorized (chứng tỏ route + env JWT/Supabase đã load)
for /f "delims=" %%A in ('curl.exe -s -o NUL -w "%%{http_code}" "%ENDPOINT%" --max-time 30') do set "CODE=%%A"

echo  HTTP status: %CODE%
echo.

if "%CODE%"=="200" (
  echo  [PASS] 200 OK — endpoint tra ve du lieu ^(da co auth^).
  exit /b 0
)
if "%CODE%"=="401" (
  echo  [PASS] 401 Unauthorized — dung ky vong khi goi ANON.
  echo         Nghia la: Vercel da deploy + route admin song + JWT middleware hoat dong.
  echo         Buoc tiep: dang nhap /admin tren trinh duyet de xac nhan full CRUD.
  exit /b 0
)
if "%CODE%"=="403" (
  echo  [WARN] 403 Forbidden — co the rate-limit hoac token sai. Thu lai sau 1 phut.
  exit /b 1
)
if "%CODE%"=="404" (
  echo  [FAIL] 404 — sai URL hoac project chua deploy Next.js App Router.
  exit /b 1
)
if "%CODE%"=="500" (
  echo  [FAIL] 500 — thieu env ^(JWT_SECRET / SUPABASE_*^) hoac loi server. Kiem tra Vercel Logs.
  exit /b 1
)
if "%CODE%"=="000" (
  echo  [FAIL] Khong ket noi duoc ^(DNS / SSL / timeout^). Doi redeploy xong roi ping lai.
  exit /b 1
)

echo  [FAIL] Ma HTTP khong mong doi: %CODE%
exit /b 1
