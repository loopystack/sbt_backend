@echo off
echo Checking Sports Betting Application Health...
echo.

echo Checking Backend (Port 5001)...
curl -s http://localhost:5001/api/health > nul
if %errorlevel% equ 0 (
    echo ✅ Backend is running on http://localhost:5001
    curl http://localhost:5001/api/health
) else (
    echo ❌ Backend is not responding on port 5001
)

echo.
echo Checking Frontend (Port 5174)...
curl -s http://localhost:5174 > nul
if %errorlevel% equ 0 (
    echo ✅ Frontend is running on http://localhost:5174
) else (
    echo ❌ Frontend is not responding on port 5174
)

echo.
echo Testing API endpoints...
curl -s "http://localhost:5001/api/odds/?page=1&size=5" > nul
if %errorlevel% equ 0 (
    echo ✅ Odds API is working
) else (
    echo ❌ Odds API is not working
)

pause
