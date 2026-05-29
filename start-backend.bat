@echo off
echo ========================================
echo  Starting PetFood Backend Services
echo ========================================

echo [1/16] Starting API Gateway (port 3000)...
start "API Gateway :3000" cmd /k "cd /d %~dp0api-gateway && npm run dev"
timeout /t 2 /nobreak >nul

echo [2/16] Starting Auth Service (port 3001)...
start "Auth Service :3001" cmd /k "cd /d %~dp0auth-service && npm run dev"
timeout /t 2 /nobreak >nul

echo [3/16] Starting User Service (port 3002)...
start "User Service :3002" cmd /k "cd /d %~dp0user-service && npm run dev"
timeout /t 2 /nobreak >nul

echo [4/16] Starting Product Service (port 3003)...
start "Product Service :3003" cmd /k "cd /d %~dp0product-service && npm run dev"
timeout /t 2 /nobreak >nul

echo [5/16] Starting Order Service (port 3004)...
start "Order Service :3004" cmd /k "cd /d %~dp0order-service && npm run dev"
timeout /t 2 /nobreak >nul

echo [6/16] Starting Category Service (port 3005)...
start "Category Service :3005" cmd /k "cd /d %~dp0category-service && npm run dev"
timeout /t 2 /nobreak >nul

echo [7/16] Starting Upload Service (port 3006)...
start "Upload Service :3006" cmd /k "cd /d %~dp0upload-service && npm run dev"
timeout /t 2 /nobreak >nul

echo [8/16] Starting Cart Service (port 3007)...
start "Cart Service :3007" cmd /k "cd /d %~dp0cart-service && npm run dev"
timeout /t 2 /nobreak >nul

echo [9/16] Starting Coupon Service (port 3008)...
start "Coupon Service :3008" cmd /k "cd /d %~dp0coupon-service && npm run dev"
timeout /t 2 /nobreak >nul

echo [10/16] Starting Payment Service (port 3009)...
start "Payment Service :3009" cmd /k "cd /d %~dp0payment-service && npm run dev"
timeout /t 2 /nobreak >nul

echo [11/16] Starting Notification Service (port 3010)...
start "Notification Service :3010" cmd /k "cd /d %~dp0notification-service && npm run dev"
timeout /t 2 /nobreak >nul

echo [12/16] Starting AI Service (port 3011)...
start "AI Service :3011" cmd /k "cd /d %~dp0ai-service && npm run dev"
timeout /t 2 /nobreak >nul

echo [13/16] Starting Chat Service (port 3012)...
start "Chat Service :3012" cmd /k "cd /d %~dp0chat-service && npm run dev"

echo [14/16] Starting Review Service (port 3013)...
start "Review Service :3013" cmd /k "cd /d %~dp0review-service && npm run dev"

echo [15/16] Starting Reward Service (port 3014)...
start "Reward Service :3014" cmd /k "cd /d %~dp0reward-service && npm run dev"

echo [16/16] Starting Appointment Service (port 3015)...
start "Appointment Service :3015" cmd /k "cd /d %~dp0appointment-service && npm run dev"

echo.
echo ========================================
echo  All backend services started!
echo  API Gateway    : http://localhost:3000
echo  Auth           : http://localhost:3001
echo  User           : http://localhost:3002
echo  Product        : http://localhost:3003
echo  Order          : http://localhost:3004
echo  Category       : http://localhost:3005
echo  Upload         : http://localhost:3006
echo  Cart           : http://localhost:3007
echo  Coupon         : http://localhost:3008
echo  Payment        : http://localhost:3009
echo  Notification   : http://localhost:3010
echo  AI Bot         : http://localhost:3011
echo  Chat           : http://localhost:3012
echo  Review         : http://localhost:3013
echo  Reward         : http://localhost:3014
echo  Appointment    : http://localhost:3015
echo ========================================
pause