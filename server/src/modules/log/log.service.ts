import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { normalizePage } from '../../common/utils/pagination.util';

@Injectable()
export class LogService {
  constructor(private readonly dataSource: DataSource) {}

  /** 登录日志分页 */
  async findLoginLogs(params: {
    keyword?: string; status?: string; beginDate?: string; endDate?: string; page: number; pageSize: number;
  }) {
    const { keyword, status, beginDate, endDate } = params;
    const { page, pageSize } = normalizePage(params.page, params.pageSize);
    const where: string[] = ['1=1'];
    const args: unknown[] = [];
    if (keyword) { where.push('(username LIKE ? OR ip LIKE ?)'); args.push(`%${keyword}%`, `%${keyword}%`); }
    if (status) { where.push('status = ?'); args.push(status); }
    if (beginDate) { where.push('login_time >= ?'); args.push(`${beginDate} 00:00:00`); }
    if (endDate) { where.push('login_time <= ?'); args.push(`${endDate} 23:59:59`); }

    const totalRows: { cnt: number }[] = await this.dataSource.query(
      `SELECT COUNT(*) as cnt FROM sys_login_log WHERE ${where.join(' AND ')}`, args,
    );
    const rows = await this.dataSource.query(
      `SELECT * FROM sys_login_log WHERE ${where.join(' AND ')} ORDER BY login_time DESC LIMIT ? OFFSET ?`,
      [...args, pageSize, (page - 1) * pageSize],
    );
    return { list: rows, total: Number(totalRows[0]?.cnt || 0), page, pageSize };
  }

  /** 操作日志分页 */
  async findOperationLogs(params: {
    keyword?: string; status?: string; beginDate?: string; endDate?: string; page: number; pageSize: number;
  }) {
    const { keyword, status, beginDate, endDate } = params;
    const { page, pageSize } = normalizePage(params.page, params.pageSize);
    const where: string[] = ['1=1'];
    const args: unknown[] = [];
    if (keyword) { where.push('(title LIKE ? OR username LIKE ? OR url LIKE ?)'); args.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }
    if (status) { where.push('status = ?'); args.push(status); }
    if (beginDate) { where.push('oper_time >= ?'); args.push(`${beginDate} 00:00:00`); }
    if (endDate) { where.push('oper_time <= ?'); args.push(`${endDate} 23:59:59`); }

    const totalRows: { cnt: number }[] = await this.dataSource.query(
      `SELECT COUNT(*) as cnt FROM sys_operation_log WHERE ${where.join(' AND ')}`, args,
    );
    const rows = await this.dataSource.query(
      `SELECT * FROM sys_operation_log WHERE ${where.join(' AND ')} ORDER BY oper_time DESC LIMIT ? OFFSET ?`,
      [...args, pageSize, (page - 1) * pageSize],
    );
    return { list: rows, total: Number(totalRows[0]?.cnt || 0), page, pageSize };
  }

  async clearLoginLogs() {
    await this.dataSource.query(`DELETE FROM sys_login_log`);
    return null;
  }

  async clearOperationLogs() {
    await this.dataSource.query(`DELETE FROM sys_operation_log`);
    return null;
  }
}
