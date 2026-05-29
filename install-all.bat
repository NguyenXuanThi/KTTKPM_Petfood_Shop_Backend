@echo off
echo ========================================
echo  Installing Dependencies For All Services
echo ========================================

echo [1/16] Installing API Gateway...
cd /d %~dp0api-gateway
call npm install
echo.

echo [2/16] Installing Auth Service...
cd /d %~dp0auth-service
call npm install
echo.

echo [3/16] Installing User Service...
cd /d %~dp0user-service
call npm install
echo.

echo [4/16] Installing Product Service...
cd /d %~dp0product-service
call npm install
echo.

echo [5/16] Installing Order Service...
cd /d %~dp0order-service
call npm install
echo.

echo [6/16] Installing Category Service...
cd /d %~dp0category-service
call npm install
echo.

echo [7/16] Installing Upload Service...
cd /d %~dp0upload-service
call npm install
echo.

echo [8/16] Installing Cart Service...
cd /d %~dp0cart-service
call npm install
echo.

echo [9/16] Installing Coupon Service...
cd /d %~dp0coupon-service
call npm install
echo.

echo [10/16] Installing Payment Service...
cd /d %~dp0payment-service
call npm install
echo.

echo [11/16] Installing Notification Service...
cd /d %~dp0notification-service
call npm install
echo.

echo [12/16] Installing AI Service...
cd /d %~dp0ai-service
call npm install
echo.

echo [13/16] Installing Chat Service...
cd /d %~dp0chat-service
call npm install
echo.

echo [14/16] Installing Review Service...
cd /d %~dp0review-service
call npm install
echo.

echo [15/16] Installing Reward Service...
cd /d %~dp0reward-service
call npm install
echo.

echo [16/16] Installing Appointment Service...
cd /d %~dp0appointment-service
call npm install
echo.

echo ========================================
echo  All dependencies installed successfully!
echo ========================================
pause