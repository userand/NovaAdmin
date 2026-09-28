#!/usr/bin/env bash
# Nova Admin 一键启动 (bash 版)
set -e
cd "$(dirname "$0")"

echo "============================================"
echo "  Nova Admin 一键启动"
echo "============================================"

echo "[1/2] 启动后端 (http://localhost:3200) ..."
(cd server && node dist/main.js > ../server.log 2>&1 &)

echo "[2/2] 启动前端 (http://localhost:5173) ..."
(cd web && npm run dev > ../web.log 2>&1 &)

echo ""
echo "启动完成！"
echo "  前端:  http://localhost:5173"
echo "  接口:  http://localhost:3200/api/docs"
echo "  账号:  admin / Admin@123"
