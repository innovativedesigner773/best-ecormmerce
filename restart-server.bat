@echo off
echo.
echo ========================================
echo    RESTARTING DEV SERVER WITH STRIPE
echo ========================================
echo.
echo Stopping any existing Node processes...
taskkill /F /IM node.exe 2>nul
echo.
echo Waiting for processes to stop...
timeout /t 2 /nobreak >nul
echo.
echo Starting fresh dev server with Stripe config...
echo.
npm run dev
