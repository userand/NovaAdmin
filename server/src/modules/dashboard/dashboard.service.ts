import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * 时间口径：库里的 DATETIME 由 TypeORM 按 +08:00 写入，统计窗口也在应用侧按东八区计算后作为参数传入，
 * 不依赖 MySQL 服务器自身的时区(NOW()/CURDATE())。
 */
const CN_OFFSET_MS = 8 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;
/** 东八区墙上时间：Date 的 UTC 字段即东八区的年月日时分秒 */
const cnDate = (offsetDays = 0) => new Date(Date.now() + CN_OFFSET_MS - offsetDays * DAY_MS);
const fmtDateTime = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');
const fmtDay = (d: Date) => d.toISOString().slice(0, 10);

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  /** 仪表盘聚合统计 */
  async getStats() {
    const since7d = fmtDateTime(cnDate(7));
    const todayStart = `${fmtDay(cnDate())} 00:00:00`;
    const [[users], [logs7d], [ops], [notices], [onlineToday]] = await Promise.all([
      this.dataSource.query(`SELECT COUNT(*) as cnt FROM sys_user WHERE deleted IS NULL`),
      this.dataSource.query(
        `SELECT COUNT(DISTINCT username) as cnt FROM sys_login_log WHERE status='0' AND login_time >= ?`,
        [since7d],
      ),
      this.dataSource.query(`SELECT COUNT(*) as cnt FROM sys_operation_log WHERE oper_time >= ?`, [since7d]),
      this.dataSource.query(`SELECT COUNT(*) as cnt FROM sys_notice WHERE deleted IS NULL AND status='0'`),
      this.dataSource.query(
        `SELECT COUNT(DISTINCT username) as cnt FROM sys_login_log WHERE status='0' AND login_time >= ?`,
        [todayStart],
      ),
    ]);

    return {
      totalUsers: Number(users.cnt),
      activeUsers7d: Number(logs7d.cnt),
      operations7d: Number(ops.cnt),
      notices: Number(notices.cnt),
      onlineToday: Number(onlineToday.cnt),
    };
  }

  /** 近 14 天登录趋势 + 成功/失败 */
  async getLoginTrend() {
    const days = Array.from({ length: 14 }, (_, i) => fmtDay(cnDate(13 - i))); // 旧 → 新
    const rows: { day: string; success: number; failed: number }[] = await this.dataSource.query(
      `SELECT DATE_FORMAT(login_time, '%Y-%m-%d') AS day,
              SUM(CASE WHEN status='0' THEN 1 ELSE 0 END) AS success,
              SUM(CASE WHEN status='1' THEN 1 ELSE 0 END) AS failed
       FROM sys_login_log
       WHERE login_time >= ?
       GROUP BY DATE_FORMAT(login_time, '%Y-%m-%d')`,
      [`${days[0]} 00:00:00`],
    );
    const byDay = new Map(rows.map((r) => [r.day, r]));
    return days.map((d) => ({
      day: d.slice(5), // MM-DD
      success: Number(byDay.get(d)?.success || 0),
      failed: Number(byDay.get(d)?.failed || 0),
    }));
  }

  /** 部门人数分布 */
  async getDeptDistribution() {
    const rows: { name: string; value: number }[] = await this.dataSource.query(`
      SELECT d.name, COUNT(u.id) AS value
      FROM sys_dept d
      LEFT JOIN sys_user u ON u.dept_id = d.id AND u.deleted IS NULL
      WHERE d.deleted IS NULL AND d.parent_id != 0
      GROUP BY d.id, d.name
      HAVING value > 0
      ORDER BY value DESC
    `);
    return rows.map((r) => ({ name: r.name, value: Number(r.value) }));
  }

  /** 性别占比 */
  async getGenderRatio() {
    const rows: { gender: string; cnt: number }[] = await this.dataSource.query(
      `SELECT gender, COUNT(*) AS cnt FROM sys_user WHERE deleted IS NULL GROUP BY gender`,
    );
    const nameMap: Record<string, string> = { '0': '保密', '1': '男', '2': '女' };
    return rows.map((r) => ({ name: nameMap[r.gender] || '未知', value: Number(r.cnt) }));
  }

  /** 操作日志模块分布(近30天) */
  async getOperationDistribution() {
    const rows: { title: string; cnt: number }[] = await this.dataSource.query(
      `SELECT title, COUNT(*) AS cnt FROM sys_operation_log
       WHERE oper_time >= ?
       GROUP BY title ORDER BY cnt DESC LIMIT 8`,
      [fmtDateTime(cnDate(30))],
    );
    return rows.map((r) => ({ name: r.title, value: Number(r.cnt) }));
  }

  /** 最新登录记录 */
  async getRecentLogins(limit = 8, maskIp = false) {
    const rows: { ip?: string }[] = await this.dataSource.query(
      `SELECT username, ip, browser, os, status, message, login_time
       FROM sys_login_log ORDER BY login_time DESC LIMIT ?`,
      [limit],
    );
    // 无日志查看权限的用户只能看到脱敏后的 IP
    return maskIp ? rows.map((r) => ({ ...r, ip: '***' })) : rows;
  }
}
