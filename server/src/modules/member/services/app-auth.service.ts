import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DataSource, Not } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AppLoginLogEntity, AppUserEntity, AppUserIdentityEntity } from '../../../entities';
import { AppSessionService } from './app-session.service';
import { MemberSettingsService } from './member-settings.service';
import { VerifyCodeService } from './verify-code.service';
import { WechatPlatform, WechatService } from './wechat.service';
import { ClientContext, isEmail, isPhone, normEmail } from '../member.util';
import type { CodeChannel } from '../notify/notify.service';
import {
  BindEmailDto, BindPhoneDto, BindWechatDto, ChangePasswordDto, EmailLoginDto, PasswordLoginDto,
  PhoneLoginDto, ResetByCodeDto, SendCodeDto, UpdateMeDto, WechatLoginDto,
} from '../dto/app.dto';

type LoginMethod = 'phone_code' | 'email_code' | 'password' | 'wechat';

/** 账号已停用：携带会员 ID，让统一的失败日志能关联到具体会员 */
class AccountDisabledException extends ForbiddenException {
  constructor(readonly userId: number) {
    super('账号已被停用，请联系客服');
  }
}

const FAIL_THRESHOLD = 5;
const LOCK_MINUTES = 10;

@Injectable()
export class AppAuthService {
  /** 密码登录失败计数(内存，单机)：按账号统计，连续 5 次失败锁定 10 分钟 */
  private readonly failCounter = new Map<string, { count: number; lockUntil: number }>();

  constructor(
    private readonly dataSource: DataSource,
    private readonly settings: MemberSettingsService,
    private readonly codes: VerifyCodeService,
    private readonly wechat: WechatService,
    private readonly session: AppSessionService,
  ) {}

  private get users() {
    return this.dataSource.getRepository(AppUserEntity);
  }
  private get identities() {
    return this.dataSource.getRepository(AppUserIdentityEntity);
  }

  // =====================================================================
  // 验证码
  // =====================================================================
  private channelOf(target: string): { channel: CodeChannel; target: string } {
    const t = target.trim();
    if (isPhone(t)) return { channel: 'phone', target: t };
    if (isEmail(t)) return { channel: 'email', target: normEmail(t) };
    throw new BadRequestException('请输入正确的手机号或邮箱');
  }

  async sendCode(dto: SendCodeDto) {
    const { channel, target } = this.channelOf(dto.target);
    if (dto.scene === 'login') {
      await this.settings.assertLoginEnabled(channel === 'phone' ? 'phone' : 'email');
      return this.codes.send('login', channel, target);
    }
    // 找回密码：账号不存在时不下发也不报错，避免被用来探测账号是否注册
    const exists = await this.users.findOne({ where: channel === 'phone' ? { phone: target } : { email: target } });
    if (!exists) return { cooldownSeconds: 60, expiresInSeconds: 300 };
    return this.codes.send('reset', channel, target);
  }

  // =====================================================================
  // 登录(4 种方式)
  // =====================================================================
  phoneLogin(dto: PhoneLoginDto, ctx: ClientContext) {
    return this.tracked('phone_code', dto.phone, ctx, async () => {
      await this.settings.assertLoginEnabled('phone');
      this.codes.verify('login', dto.phone, dto.code);
      let user = await this.users.findOne({ where: { phone: dto.phone } });
      let isNew = false;
      if (!user) {
        await this.assertRegisterOpen();
        user = await this.users.save(this.users.create({ nickname: `用户${dto.phone.slice(-4)}`, phone: dto.phone, source: 'phone' }));
        isNew = true;
      }
      return this.finish(user, 'phone_code', dto.phone, ctx, isNew);
    });
  }

  emailLogin(dto: EmailLoginDto, ctx: ClientContext) {
    const email = normEmail(dto.email);
    return this.tracked('email_code', email, ctx, async () => {
      await this.settings.assertLoginEnabled('email');
      this.codes.verify('login', email, dto.code);
      let user = await this.users.findOne({ where: { email } });
      let isNew = false;
      if (!user) {
        await this.assertRegisterOpen();
        user = await this.users.save(this.users.create({ nickname: email.split('@')[0].slice(0, 20), email, source: 'email' }));
        isNew = true;
      }
      return this.finish(user, 'email_code', email, ctx, isNew);
    });
  }

  passwordLogin(dto: PasswordLoginDto, ctx: ClientContext) {
    const { channel, target } = this.channelOf(dto.account);
    return this.tracked('password', target, ctx, async () => {
      await this.settings.assertLoginEnabled('password');
      this.assertNotLocked(target);

      const user = await this.users
        .createQueryBuilder('u')
        .addSelect('u.password')
        .where(channel === 'phone' ? 'u.phone = :t' : 'u.email = :t', { t: target })
        .getOne();
      // 账号不存在与密码错误给出相同提示，且同样计入失败次数
      if (!user || !user.password || !(await bcrypt.compare(dto.password, user.password))) {
        this.recordFailure(target);
        if (user && !user.password) throw new UnauthorizedException('该账号未设置密码，请使用验证码登录');
        throw new UnauthorizedException('账号或密码错误');
      }
      this.failCounter.delete(target);
      return this.finish(user, 'password', target, ctx, false);
    });
  }

  wechatLogin(dto: WechatLoginDto, ctx: ClientContext) {
    return this.tracked('wechat', `wechat_${dto.platform}`, ctx, async () => {
      await this.settings.assertLoginEnabled('wechat');
      const idn = await this.wechat.resolve(dto.platform, dto.code);

      let identity = await this.identities.findOne({ where: { provider: idn.provider, openId: idn.openId } });
      let user = identity ? await this.users.findOne({ where: { id: identity.userId } }) : null;
      if (identity && !user) {
        // 关联的会员已被删除：清理孤儿身份，按新用户处理
        await this.identities.delete(identity.id);
        identity = null;
      }
      // 同一微信开放平台主体下的其他应用(unionid 相同)视为同一个人
      if (!user && idn.unionId) {
        const sibling = await this.identities.findOne({ where: { unionId: idn.unionId } });
        if (sibling) user = await this.users.findOne({ where: { id: sibling.userId } });
      }

      let isNew = false;
      if (!user) {
        await this.assertRegisterOpen();
        user = await this.dataSource.transaction(async (m) => {
          const created = await m.getRepository(AppUserEntity).save(
            m.getRepository(AppUserEntity).create({
              nickname: (dto.nickname || idn.nickname || '微信用户').slice(0, 32),
              avatar: dto.avatar || idn.avatar || '',
              source: 'wechat',
            }),
          );
          await m.getRepository(AppUserIdentityEntity).save(
            m.getRepository(AppUserIdentityEntity).create({
              userId: created.id, provider: idn.provider, openId: idn.openId, unionId: idn.unionId ?? null,
              nickname: idn.nickname || dto.nickname || '', avatar: idn.avatar || dto.avatar || '',
            }),
          );
          return created;
        });
        isNew = true;
      } else if (!identity) {
        await this.identities.save(
          this.identities.create({ userId: user.id, provider: idn.provider, openId: idn.openId, unionId: idn.unionId ?? null }),
        );
      }
      return this.finish(user, 'wechat', `wechat_${dto.platform}`, ctx, isNew);
    });
  }

  // =====================================================================
  // 令牌 / 密码找回
  // =====================================================================
  async refresh(refreshToken: string) {
    const payload = await this.session.verify(refreshToken, 'refresh');
    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('账号不存在或已注销');
    return this.session.issue(user);
  }

  /** all=true：令牌版本 +1，该账号所有设备的登录立即失效；否则仅由客户端丢弃本地令牌 */
  async logout(userId: number, all?: boolean) {
    if (all) await this.bumpTokenVersion(userId);
    return null;
  }

  async resetPasswordByCode(dto: ResetByCodeDto) {
    const { channel, target } = this.channelOf(dto.target);
    this.codes.verify('reset', target, dto.code);
    const user = await this.users.findOne({ where: channel === 'phone' ? { phone: target } : { email: target } });
    if (!user) throw new BadRequestException('账号不存在');
    await this.users.update(user.id, { password: await bcrypt.hash(dto.newPassword, 10), tokenVersion: () => 'token_version + 1' });
    this.session.invalidate(user.id);
    this.failCounter.delete(target);
    return null;
  }

  // =====================================================================
  // 个人资料 / 账号安全
  // =====================================================================
  async getMe(userId: number) {
    const user = await this.mustGet(userId);
    return this.profile(user);
  }

  async updateMe(userId: number, dto: UpdateMeDto) {
    await this.mustGet(userId);
    const patch: Partial<AppUserEntity> = {};
    if (dto.nickname !== undefined) patch.nickname = dto.nickname.trim();
    if (dto.gender !== undefined) patch.gender = dto.gender;
    if (dto.avatar !== undefined) patch.avatar = dto.avatar;
    if (dto.birthday !== undefined) patch.birthday = dto.birthday || null;
    if (Object.keys(patch).length) await this.users.update(userId, patch);
    return this.getMe(userId);
  }

  async setAvatar(userId: number, url: string) {
    await this.users.update(userId, { avatar: url });
    return { avatar: url };
  }

  /** 设置/修改密码：已有密码需校验旧密码；成功后旧令牌全部失效，返回新令牌保证当前设备不掉线 */
  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.users.createQueryBuilder('u').addSelect('u.password').where('u.id = :id', { id: userId }).getOne();
    if (!user) throw new UnauthorizedException('账号不存在');
    if (user.password) {
      if (!dto.oldPassword) throw new BadRequestException('请输入旧密码');
      if (!(await bcrypt.compare(dto.oldPassword, user.password))) throw new BadRequestException('旧密码不正确');
    }
    await this.users.update(userId, { password: await bcrypt.hash(dto.newPassword, 10), tokenVersion: () => 'token_version + 1' });
    this.session.invalidate(userId);
    const fresh = await this.mustGet(userId);
    return this.session.issue(fresh);
  }

  async sendBindCode(userId: number, rawTarget: string) {
    await this.mustGet(userId);
    const { channel, target } = this.channelOf(rawTarget);
    const owner = await this.users.findOne({ where: channel === 'phone' ? { phone: target } : { email: target } });
    if (owner && Number(owner.id) !== Number(userId)) {
      throw new BadRequestException(`该${channel === 'phone' ? '手机号' : '邮箱'}已被其他账号使用`);
    }
    return this.codes.send('bind', channel, target);
  }

  async bindPhone(userId: number, dto: BindPhoneDto) {
    await this.mustGet(userId);
    this.codes.verify('bind', dto.phone, dto.code);
    const owner = await this.users.findOne({ where: { phone: dto.phone, id: Not(userId) } });
    if (owner) throw new BadRequestException('该手机号已被其他账号使用');
    await this.users.update(userId, { phone: dto.phone });
    return this.getMe(userId);
  }

  async bindEmail(userId: number, dto: BindEmailDto) {
    await this.mustGet(userId);
    const email = normEmail(dto.email);
    this.codes.verify('bind', email, dto.code);
    const owner = await this.users.findOne({ where: { email, id: Not(userId) } });
    if (owner) throw new BadRequestException('该邮箱已被其他账号使用');
    await this.users.update(userId, { email });
    return this.getMe(userId);
  }

  async bindWechat(userId: number, dto: BindWechatDto) {
    await this.mustGet(userId);
    const idn = await this.wechat.resolve(dto.platform, dto.code);
    const existing = await this.identities.findOne({ where: { provider: idn.provider, openId: idn.openId } });
    if (existing) {
      if (Number(existing.userId) === Number(userId)) return this.getMe(userId);
      throw new BadRequestException('该微信已绑定其他账号');
    }
    const already = await this.identities.findOne({ where: { userId, provider: idn.provider } });
    if (already) throw new BadRequestException('当前账号已绑定该平台的微信，请先解绑');
    await this.identities.save(
      this.identities.create({ userId, provider: idn.provider, openId: idn.openId, unionId: idn.unionId ?? null, nickname: idn.nickname || '', avatar: idn.avatar || '' }),
    );
    return this.getMe(userId);
  }

  async unbindIdentity(userId: number, provider: string) {
    const user = await this.mustGet(userId);
    const list = await this.identities.find({ where: { userId } });
    const target = list.find((i) => i.provider === provider);
    if (!target) throw new NotFoundException('未绑定该登录方式');
    // 解绑后至少要保留一种可用的登录方式，否则账号将无法再登录
    const remaining = list.length - 1 + (user.phone ? 1 : 0) + (user.email ? 1 : 0);
    if (remaining < 1) throw new BadRequestException('请先绑定手机号或邮箱，再解绑微信');
    await this.identities.delete(target.id);
    return this.getMe(userId);
  }

  // =====================================================================
  // 内部工具
  // =====================================================================
  private async assertRegisterOpen() {
    if (!(await this.settings.registerEnabled())) throw new ForbiddenException('暂未开放注册，请联系管理员');
  }

  private assertNotLocked(account: string) {
    const rec = this.failCounter.get(account);
    if (rec && rec.lockUntil > Date.now()) {
      throw new UnauthorizedException(`登录失败次数过多，请 ${Math.ceil((rec.lockUntil - Date.now()) / 60000)} 分钟后重试`);
    }
  }

  private recordFailure(account: string) {
    const rec = this.failCounter.get(account) || { count: 0, lockUntil: 0 };
    rec.count += 1;
    if (rec.count >= FAIL_THRESHOLD) {
      rec.count = 0;
      rec.lockUntil = Date.now() + LOCK_MINUTES * 60 * 1000;
    }
    this.failCounter.set(account, rec);
    if (this.failCounter.size > 1000) {
      const now = Date.now();
      this.failCounter.forEach((v, k) => v.count === 0 && v.lockUntil <= now && this.failCounter.delete(k));
    }
  }

  private async mustGet(userId: number) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('账号不存在或已注销');
    return user;
  }

  private async bumpTokenVersion(userId: number) {
    await this.users.update(userId, { tokenVersion: () => 'token_version + 1' });
    this.session.invalidate(userId);
  }

  /** 统一登录审计：无论哪种方式，成功/失败都落库 */
  private async tracked<T>(method: LoginMethod, account: string, ctx: ClientContext, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const message = ((err as { message?: string }).message || '登录失败').slice(0, 120);
      const userId = err instanceof AccountDisabledException ? Number(err.userId) : null;
      await this.writeLog(userId, account, method, ctx, '1', message);
      throw err;
    }
  }

  private async writeLog(userId: number | null, account: string, method: string, ctx: ClientContext, status: '0' | '1', message: string) {
    try {
      const repo = this.dataSource.getRepository(AppLoginLogEntity);
      await repo.save(repo.create({ userId, account, method, client: ctx.client, ip: ctx.ip, location: ctx.location, os: ctx.os, status, message, loginTime: new Date() }));
    } catch { /* 日志失败不影响登录 */ }
  }

  private async finish(user: AppUserEntity, method: LoginMethod, account: string, ctx: ClientContext, isNewUser: boolean) {
    if (user.status !== '0') throw new AccountDisabledException(Number(user.id));
    await this.users.update(user.id, { lastLoginAt: new Date(), lastLoginIp: ctx.ip, loginCount: () => 'login_count + 1' });
    await this.writeLog(Number(user.id), account, method, ctx, '0', isNewUser ? '注册并登录' : '登录成功');
    const fresh = await this.mustGet(Number(user.id));
    const tokens = await this.session.issue(fresh);
    const profile = await this.profile(fresh);
    return { ...tokens, isNewUser, needBindPhone: !fresh.phone, user: profile };
  }

  /** 返回给客户端的资料：不含密码哈希，phone/email 仅本人可见完整值 */
  private async profile(user: AppUserEntity) {
    const [pw] = await this.dataSource.query(`SELECT (password IS NOT NULL) AS hp FROM app_user WHERE id = ?`, [Number(user.id)]);
    const ids = await this.identities.find({ where: { userId: user.id } });
    return {
      id: Number(user.id),
      nickname: user.nickname,
      avatar: user.avatar,
      gender: user.gender,
      birthday: user.birthday,
      phone: user.phone,
      email: user.email,
      hasPassword: !!Number(pw?.hp),
      source: user.source,
      createdAt: user.createdAt,
      bindings: {
        phone: !!user.phone,
        email: !!user.email,
        wechat: ids.map((i) => ({ platform: i.provider.replace('wechat_', '') as WechatPlatform, nickname: i.nickname, boundAt: i.createdAt })),
      },
    };
  }
}
