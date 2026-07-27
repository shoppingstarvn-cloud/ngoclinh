@echo off
:: Chạy sau khi Module 2 (Make/n8n) Redeploy xong ~1–3 phút
setlocal
cd /d "%~dp0"

echo.
echo  [1] Mo Supabase SQL Editor de chay 03_VERIFY_STORAGE.sql
echo      https://supabase.com/dashboard/project/bfruxinvvvaqufghtigw/sql/new
echo.
start "" "https://supabase.com/dashboard/project/bfruxinvvvaqufghtigw/sql/new"

echo  [2] Ping Vercel admin API...
call "%~dp0PING-VERCEL-ADMIN.cmd" %*
set ERR=%ERRORLEVEL%

echo.
if %ERR%==0 (
  echo  ============================================
  echo   VERIFY PASS — he thong da thong luong
  echo  ============================================
) else (
  echo  ============================================
  echo   VERIFY FAIL — xem Vercel Logs / env vars
  echo  ============================================
)
pause
exit /b %ERR%
