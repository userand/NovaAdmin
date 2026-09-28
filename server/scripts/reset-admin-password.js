#!/usr/bin/env node
/**
 * 重置后台账号密码(部署后第一件事：改掉种子数据里的默认密码 Admin@123)。
 *
 *   docker compose exec server node scripts/reset-admin-password.js admin '新密码'
 *   # 或用环境变量，避免密码留在 shell 历史里：
 *   docker compose exec -e NEW_PASSWORD='新密码' server node scripts/reset-admin-password.js admin
 *
 * 本地开发同样可用：cd server && node scripts/reset-admin-password.js admin '新密码'
 * 数据库连接读取 DB_HOST / DB_PORT / DB_USER / DB_PASS / DB_NAME(容器内已由 compose 注入)。
 */
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true }); } catch { /* 容器内没有 .env，无需加载 */ }
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function main() {
  const [username, argPassword] = process.argv.slice(2);
  const password = process.env.NEW_PASSWORD || argPassword;
  if (!username || !password) {
    console.error('用法: node scripts/reset-admin-password.js <用户名> <新密码>   (或设置环境变量 NEW_PASSWORD)');
    process.exit(1);
  }
  if (!/^(?=.*[a-zA-Z])(?=.*\d).{8,32}$/.test(password)) {
    console.error('密码须为 8-32 位，且同时包含字母和数字');
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'root',
    database: process.env.DB_NAME || 'nova_admin',
  });
  try {
    const hash = await bcrypt.hash(password, 10);
    const [res] = await conn.execute('UPDATE sys_user SET password = ? WHERE username = ? AND deleted IS NULL', [hash, username]);
    if (!res.affectedRows) {
      console.error(`未找到账号：${username}`);
      process.exit(2);
    }
    console.log(`已重置账号 ${username} 的密码。`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('执行失败：', err.message);
  process.exit(1);
});
