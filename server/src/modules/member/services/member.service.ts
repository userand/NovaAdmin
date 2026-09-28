import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Not } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AppUserEntity, AppUserIdentityEntity } from '../../../entities';
import { AppSessionService } from './app-session.service';
import { MemberSettingsService, SettingName } from './member-settings.service';
import { NotifyService } from '../notify/notify.service';
import { WECHAT_PLATFORMS, WechatService } from './wechat.service';
import { maskEmail, maskPhone, normEmail } from '../member.util';
import { CreateMemberDto, QueryMemberDto, QueryMemberLogDto, UpdateMemberDto } from '../dto/member.dto';

const CN_OFFSET_MS = 8 * 3600 * 1000;
const cnDate = (offsetDays = 0) => new Date(Date.now() + CN_OFFSET_MS - offsetDays * 86400_000);
const fmt = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');

/** 会员后台管理 */
@Injectable()
export class MemberService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly session: AppSessionService,
    private readonly settings: MemberSettingsService,
    private readonly notify: NotifyService,
    private readonly wechat: WechatService,
  ) {}

  private get users() {
    return this.dataSource.getRepository(AppUserEntity);
  }
  private get identities() {
    return this.dataSource.getRepository(AppUserIdentityEntity);
  }

  // ---------------------------------------------------------------- 列表 / 统计
  async findAll(dto: QueryMemberDto) {
    const qb = this.users.createQueryBuilder('u');
    if (dto.keyword) {
      qb.andWhere('(u.nickname LIKE :kw OR u.phone LIKE :kw OR u.email LIKE :kw)', { kw: `%${dto.keyword}%` });
    }
    if (dto.status) qb.andWhere('u.status = :status', { status: dto.status });
    if (dto.source) qb.andWhere('u.source = :source', { source: dto.source });
    if (dto.beginDate) qb.andWhere('u.created_at >= :b', { b: `${dto.beginDate} 00:00:00` });
    if (dto.endDate) qb.andWhere('u.created_at <= :e', { e: `${dto.endDate} 23:59:59` });

    const total = await qb.getCount();
    const rows = await qb.orderBy('u.id', 'DESC').skip((dto.page - 1) * dto.pageSize).take(dto.pageSize).getMany();

    const ids = rows.map((r) => Number(r.id));
    const idn: { user_id: number; provider: string }[] = ids.length
      ? await this.dataSource.query(`SELECT user_id, provider FROM app_user_identity WHERE user_id IN (?)`, [ids])
      : [];
    const wxMap = new Map<number, string[]>();
    idn.forEach((i) => wxMap.set(Number(i.user_id), [...(wxMap.get(Number(i.user_id)) || []), i.provider.replace('wechat_', '')]));

    return {
      list: rows.map((u) => ({
        id: Number(u.id),
        nickname: u.nickname,
        avatar: u.avatar,
        gender: u.gender,
        // 列表只展示脱敏后的联系方式，完整信息在详情里(需要 member:list 权限)
        phone: maskPhone(u.phone),
        email: maskEmail(u.email),
        hasPhone: !!u.phone,
        hasEmail: !!u.email,
        wechat: wxMap.get(Number(u.id)) || [],
        source: u.source,
        status: u.status,
        lastLoginAt: u.lastLoginAt,
        loginCount: u.loginCount,
        createdAt: u.createdAt,
      })),
      total, page: dto.page, pageSize: dto.pageSize,
    };
  }

  async stats() {
    const today = `${fmt(cnDate()).slice(0, 10)} 00:00:00`;
    const since7d = fmt(cnDate(7));
    const one = async (sql: string, params: unknown[] = []) => Number(((await this.dataSource.query(sql, params))[0] || {}).c || 0);
    const [total, todayNew, active7d, disabled, wechatBound] = await Promise.all([
      one(`SELECT COUNT(*) c FROM app_user WHERE deleted IS NULL`),
      one(`SELECT COUNT(*) c FROM app_user WHERE deleted IS NULL AND created_at >= ?`, [today]),
      one(`SELECT COUNT(*) c FROM app_user WHERE deleted IS NULL AND last_login_at >= ?`, [since7d]),
      one(`SELECT COUNT(*) c FROM app_user WHERE deleted IS NULL AND status = '1'`),
      one(`SELECT COUNT(DISTINCT i.user_id) c FROM app_user_identity i JOIN app_user u ON u.id = i.user_id AND u.deleted IS NULL`),
    ]);
    const bySource: { source: string; c: number }[] = await this.dataSource.query(
      `SELECT source, COUNT(*) c FROM app_user WHERE deleted IS NULL GROUP BY source`,
    );
    return { total, todayNew, active7d, disabled, wechatBound, bySource: bySource.map((r) => ({ source: r.source, count: Number(r.c) })) };
  }

  // ---------------------------------------------------------------- 详情
  async findOne(id: number) {
    const user = await this.mustFind(id);
    const [pw] = await this.dataSource.query(`SELECT (password IS NOT NULL) AS hp FROM app_user WHERE id = ?`, [id]);
    const identities = await this.identities.find({ where: { userId: id }, order: { id: 'ASC' } });
    const logs = await this.dataSource.query(
      `SELECT id, method, client, ip, location, os, status, message, login_time
       FROM app_login_log WHERE user_id = ? ORDER BY id DESC LIMIT 10`,
      [id],
    );
    return {
      id: Number(user.id),
      nickname: user.nickname,
      avatar: user.avatar,
      gender: user.gender,
      birthday: user.birthday,
      phone: user.phone || '',
      email: user.email || '',
      status: user.status,
      source: user.source,
      remark: user.remark,
      hasPassword: !!Number(pw?.hp),
      lastLoginAt: user.lastLoginAt,
      lastLoginIp: user.lastLoginIp,
      loginCount: user.loginCount,
      createdAt: user.createdAt,
      identities: identities.map((i) => ({
        id: Number(i.id), provider: i.provider, openId: `${i.openId.slice(0, 6)}…${i.openId.slice(-4)}`, nickname: i.nickname, createdAt: i.createdAt,
      })),
      recentLogins: logs,
    };
  }

  // ---------------------------------------------------------------- 增删改
  async create(dto: CreateMemberDto) {
    const phone = dto.phone || null;
    const email = dto.email ? normEmail(dto.email) : null;
    await this.assertUnique(phone, email);
    const saved = await this.users.save(
      this.users.create({
        nickname: dto.nickname.trim(),
        phone, email,
        password: dto.password ? await bcrypt.hash(dto.password, 10) : null,
        gender: dto.gender || '0',
        status: dto.status || '0',
        remark: dto.remark || '',
        source: 'admin',
      }),
    );
    return { id: Number(saved.id) };
  }

  async update(id: number, dto: UpdateMemberDto) {
    const user = await this.mustFind(id);
    const patch: Partial<AppUserEntity> = { nickname: dto.nickname.trim() };
    if (dto.gender !== undefined) patch.gender = dto.gender;
    if (dto.remark !== undefined) patch.remark = dto.remark;
    if (dto.phone !== undefined) patch.phone = dto.phone || null;
    if (dto.email !== undefined) patch.email = dto.email ? normEmail(dto.email) : null;
    await this.assertUnique(patch.phone ?? null, patch.email ?? null, id, dto.phone !== undefined, dto.email !== undefined);

    const disabling = dto.status === '1' && user.status !== '1';
    if (dto.status) patch.status = dto.status;
    await this.users.update(id, disabling ? { ...patch, tokenVersion: () => 'token_version + 1' } : patch);
    this.session.invalidate(id);
    return null;
  }

  async resetPassword(id: number, password: string) {
    await this.mustFind(id);
    await this.users.update(id, { password: await bcrypt.hash(password, 10), tokenVersion: () => 'token_version + 1' });
    this.session.invalidate(id);
    return null;
  }

  /** 强制下线：令牌版本 +1，该会员所有设备的登录立即失效 */
  async kick(id: number) {
    await this.mustFind(id);
    await this.users.update(id, { tokenVersion: () => 'token_version + 1' });
    this.session.invalidate(id);
    return null;
  }

  /** 删除(注销)：释放手机号/邮箱/微信以便重新注册，保留一条脱敏的历史记录 */
  async remove(id: number) {
    const user = await this.mustFind(id);
    const note = `[已注销 ${fmt(cnDate())}] 原手机:${maskPhone(user.phone) || '-'} 原邮箱:${maskEmail(user.email) || '-'}`;
    await this.dataSource.transaction(async (m) => {
      await m.getRepository(AppUserEntity).update(id, {
        phone: null, email: null, password: null,
        remark: `${user.remark ? user.remark + ' ' : ''}${note}`.slice(0, 255),
        tokenVersion: () => 'token_version + 1',
      });
      await m.getRepository(AppUserIdentityEntity).delete({ userId: id });
      await m.getRepository(AppUserEntity).softDelete(id);
    });
    this.session.invalidate(id);
    return null;
  }

  async unbindIdentity(id: number, identityId: number) {
    const idn = await this.identities.findOne({ where: { id: identityId, userId: id } });
    if (!idn) throw new NotFoundException('绑定记录不存在');
    await this.identities.delete(identityId);
    return null;
  }

  // ---------------------------------------------------------------- 登录方式设置
  async getSettings() {
    const providers = {
      sms: { provider: this.notify.smsProvider(), configured: this.notify.smsConfigured },
      email: { configured: this.notify.mailConfigured },
      wechat: {
        mock: this.wechat.mockEnabled,
        platforms: Object.fromEntries(WECHAT_PLATFORMS.map((p) => [p, this.wechat.configured(p)])),
      },
    };
    return { switches: await this.settings.all(), providers };
  }

  async updateSettings(patch: Partial<Record<SettingName, boolean>>) {
    const next = { ...(await this.settings.all()), ...patch };
    // 至少保留一种登录方式，否则会员将无法登录
    if (!next.phone && !next.email && !next.password && !next.wechat) throw new BadRequestException('至少需要开启一种登录方式');
    await this.settings.update(patch);
    return this.getSettings();
  }

  // ---------------------------------------------------------------- 登录日志
  async findLogs(dto: QueryMemberLogDto) {
    const where: string[] = ['1=1'];
    const args: unknown[] = [];
    if (dto.keyword) {
      where.push('(l.account LIKE ? OR l.ip LIKE ? OR u.nickname LIKE ?)');
      args.push(`%${dto.keyword}%`, `%${dto.keyword}%`, `%${dto.keyword}%`);
    }
    if (dto.method) { where.push('l.method = ?'); args.push(dto.method); }
    if (dto.status) { where.push('l.status = ?'); args.push(dto.status); }
    if (dto.beginDate) { where.push('l.login_time >= ?'); args.push(`${dto.beginDate} 00:00:00`); }
    if (dto.endDate) { where.push('l.login_time <= ?'); args.push(`${dto.endDate} 23:59:59`); }
    const from = `FROM app_login_log l LEFT JOIN app_user u ON u.id = l.user_id WHERE ${where.join(' AND ')}`;
    const [cnt] = await this.dataSource.query(`SELECT COUNT(*) c ${from}`, args);
    const list = await this.dataSource.query(
      `SELECT l.id, l.user_id, l.account, l.method, l.client, l.ip, l.location, l.os, l.status, l.message, l.login_time, u.nickname
       ${from} ORDER BY l.id DESC LIMIT ? OFFSET ?`,
      [...args, dto.pageSize, (dto.page - 1) * dto.pageSize],
    );
    // 账号列里的手机/邮箱脱敏
    const masked = list.map((r: { account: string }) => ({
      ...r,
      account: /^1[3-9]\d{9}$/.test(r.account) ? maskPhone(r.account) : r.account.includes('@') ? maskEmail(r.account) : r.account,
    }));
    return { list: masked, total: Number(cnt.c), page: dto.page, pageSize: dto.pageSize };
  }

  // ---------------------------------------------------------------- 内部
  private async mustFind(id: number) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('会员不存在');
    return user;
  }

  private async assertUnique(phone: string | null, email: string | null, selfId?: number, checkPhone = true, checkEmail = true) {
    // withDeleted：数据库唯一索引对已软删的记录同样生效(删除时已释放，这里兜底给出友好提示)
    if (phone && checkPhone) {
      const dup = await this.users.findOne({ where: selfId ? { phone, id: Not(selfId) } : { phone }, withDeleted: true });
      if (dup) throw new BadRequestException('该手机号已被其他会员使用');
    }
    if (email && checkEmail) {
      const dup = await this.users.findOne({ where: selfId ? { email, id: Not(selfId) } : { email }, withDeleted: true });
      if (dup) throw new BadRequestException('该邮箱已被其他会员使用');
    }
  }
}
