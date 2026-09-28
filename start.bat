@echo off
chcp 65001 >nul
title Nova Admin - Start All

echo ============================================
echo   Nova Admin 一键启动
echo ============================================

echo [1/2] 启动后端 (http://localhost:3200) ...
start "nova-server" cmd /k "cd /d %~dp0server && node dist/main.js"

echo [2/2] 启动前端 (http://localhost:5173) ...
start "nova-web" cmd /k "cd /d %~dp0web && npm run dev"

echo.
echo 启动完成！
echo   前端:  http://localhost:5173
echo   接口:  http://localhost:3200/api/docs
echo   账号:  admin / Admin@123
echo.
pause
