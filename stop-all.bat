@echo off
echo ========================================
echo  Stopping All PetFood Services
echo ========================================

echo Stopping Node.js processes...
taskkill /F /IM node.exe /T 2>nul

echo.
echo ========================================
echo  All services stopped!
echo ========================================
pause
