import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource, In } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as svgCaptcha from 'svg-captcha';
import { v4 as uuidv4 } from 'uuid';
import { UserEntity, LoginLogEntity, MenuEntity, RoleEntity } from '../../entities';
import { RbacService } from '../rbac/rbac.service';
import { LoginDto } from './dto/auth.dto';
import { parseUserAgent, ipToLocation } from '../../common/utils/user-agent.util';
import { buildTree } from '../../common/utils/tree.util';
import { jwtAccessSecret, jwtRefreshSecret, jwtAccessExpires, jwtRefreshExpires } from '../../common/utils/jwt.util';
import type { AuthRequest } from '../../common/decorators/current-user.decorator';

const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const FAIL_THRESHOLD = 5;
const LOCK_MINUTES = 10;

interface CaptchaEntry {
  code: string;
  expireAt: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly captchaStore = new Map<string, CaptchaEntry>();
  private readonly failCounter = new Map<string, { count: number; lockUntil: number }>();

  constructor(
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly rbacService: RbacService,
  ) {}

  private get userRepo() {
    return this.dataSource.getRepository(UserEntity);
  }
  private get loginLogRepo() {
    return this.dataSource.getRepository(LoginLogEntity);
  }

  /** 生成图形验证码(内存存储，生产建议替换为 Redis) */
  getCaptcha(): { captchaId: string; image: string } {
    const captcha = svgCaptcha.create({
      size: 4,
      // 纯小写 + 去除易混淆字符(l/i/o/1/0)，保证肉眼可准确辨认
      charPreset: 'abcdefghjkmnpqrstuvwxyz23456789',
      noise: 2,
      color: true,
      background: '#f2f6ff',
      width: 132,
      height: 44,
      fontSize: 40,
    });
    const captchaId = uuidv4();
    this.captchaStore.set(captchaId, { code: captcha.text.toLowerCase(), expireAt: Date.now() + CAPTCHA_TTL_MS });
    // 顺手清理过期验证码
    this.captchaStore.forEach((v, k) => v.expireAt < Date.now() && this.captchaStore.delete(k));
    return { captchaId, image: `data:image/svg+xml;base64,${Buffer.from(captcha.data).toString('base64')}` };
  }

  private async verifyCaptcha(captchaId: string, code: string) {
    // 支持通过参数配置(sys.login.captcha)动态开关验证码
    const configRows: { value: string }[] = await this.dataSource.query(
      `SELECT value FROM sys_config WHERE \`key\` = 'sys.login.captcha' AND deleted IS NULL`,
    );
    if (configRows[0]?.value === 'false') return;

    const entry = this.captchaStore.get(captchaId);
    this.captchaStore.delete(captchaId); // 一次性使用
    // 容错：去首尾空格 + 忽略大小写（字符集本身已排除易混淆字符）
    const normalized = (code || '').trim().toLowerCase();
    if (!entry || entry.expireAt < Date.now()) throw new BadRequestException('验证码已过期，请刷新后重试');
    if (entry.code !== normalized) throw new BadRequestException('验证码错误');
  }

  private ensureNotLocked(username: string) {
    const record = this.failCounter.get(username);
    if (record && record.lockUntil > Date.now()) {
      const remainMinutes = Math.ceil((record.lockUntil - Date.now()) / 60000);
      throw new UnauthorizedException(`账号已被锁定，请 ${remainMinutes} 分钟后重试`);
    }
  }

  private recordFailure(username: string) {
    const record = this.failCounter.get(username) || { count: 0, lockUntil: 0 };
    record.count += 1;
    if (record.count >= FAIL_THRESHOLD) {
      record.lockUntil = Date.now() + LOCK_MINUTES * 60 * 1000;
      record.count = 0;
      this.logger.warn(`账号 ${username} 连续 ${FAIL_THRESHOLD} 次登录失败，锁定 ${LOCK_MINUTES} 分钟`);
    }
    this.failCounter.set(username, record);
    // 顺手清理已解锁且无失败计数的记录，避免内存无限增长
    if (this.failCounter.size > 1000) {
      const now = Date.now();
      this.failCounter.forEach((v, k) => v.count === 0 && v.lockUntil <= now && this.failCounter.delete(k));
    }
  }

  /** 登录：验证码 → 锁定检查 → 密码校验 → 签发双 Token */
  async login(dto: LoginDto, request: AuthRequest) {
    const ua = parseUserAgent(request.headers['user-agent'] as string);
    const ip = request.ip || '';
    const location = ipToLocation(ip);

    try {
      await this.verifyCaptcha(dto.captchaId, dto.captchaCode);
    } catch (err) {
      // 验证码失败也留痕，便于排查"登录不了"类问题
      const message = err instanceof BadRequestException ? err.message : '验证码校验失败';
      await this.loginLogRepo.save(
        this.loginLogRepo.create({
          username: dto.username, ip, location, browser: ua.browser, os: ua.os,
          status: '1', message, loginTime: new Date(),
        }),
      );
      throw err;
    }
    this.ensureNotLocked(dto.username);

    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password') // password 列默认 select:false
      .where('u.username = :username AND u.status = :status AND u.deleted IS NULL', {
        username: dto.username, status: '0',
      })
      .getOne();

    const fail = async (message: string, status = '1') => {
      this.recordFailure(dto.username);
      await this.loginLogRepo.save(
        this.loginLogRepo.create({
          username: dto.username, ip, location, browser: ua.browser, os: ua.os,
          status, message, loginTime: new Date(),
        }),
      );
      throw new UnauthorizedException(message);
    };

    if (!user) return fail('账号或密码错误');
    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) return fail('账号或密码错误');

    this.failCounter.delete(dto.username);

    const accessToken = await this.signToken(user, false);
    const refreshToken = await this.signToken(user, true);
    const roles = await this.rbacService.getUserRoles(Number(user.id));
    const { permissions, isSuperAdmin } = await this.rbacService.getUserPermissionSet(Number(user.id));

    await this.userRepo.update(user.id, {
      lastLoginAt: new Date(),
      lastLoginIp: ip,
      loginCount: (user.loginCount || 0) + 1,
    });
    await this.loginLogRepo.save(
      this.loginLogRepo.create({
        username: user.username, ip, location, browser: ua.browser, os: ua.os,
        status: '0', message: '登录成功', loginTime: new Date(),
      }),
    );

    return {
      accessToken,
      refreshToken,
      userInfo: {
        id: Number(user.id),
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        deptId: user.deptId ? Number(user.deptId) : null,
        roles: roles.map((r) => r.code),
        roleNames: roles.map((r) => r.name),
        isSuperAdmin,
      },
      permissions: [...permissions],
    };
  }

  private async signToken(user: UserEntity, isRefresh: boolean): Promise<string> {
    const payload = {
      sub: Number(user.id),
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      type: isRefresh ? 'refresh' : 'access',
    };
    return this.jwtService.signAsync(payload, {
      secret: isRefresh ? jwtRefreshSecret() : jwtAccessSecret(),
      expiresIn: (isRefresh ? jwtRefreshExpires() : jwtAccessExpires()) as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });
  }

  /** 刷新 accessToken */
  async refresh(refreshToken: string) {
    let payload: { sub: number; type?: string; iat?: number };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, { secret: jwtRefreshSecret() });
    } catch {
      throw new UnauthorizedException('刷新令牌无效或已过期，请重新登录');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('令牌类型错误');
    if (this.rbacService.isTokenRevoked(payload.sub, payload.iat)) {
      throw new UnauthorizedException('登录已失效，请重新登录');
    }
    const user = await this.userRepo.findOne({ where: { id: payload.sub, status: '0' } });
    if (!user) throw new UnauthorizedException('用户不存在或已停用');
    const accessToken = await this.signToken(user, false);
    const newRefreshToken = await this.signToken(user, true);
    return { accessToken, refreshToken: newRefreshToken };
  }

  /** 当前用户详情(个人中心/会话恢复)：附带权限集合供前端刷新后恢复按钮权限 */
  async profile(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');
    const roles = await this.rbacService.getUserRoles(userId);
    const { permissions, isSuperAdmin } = await this.rbacService.getUserPermissionSet(userId);
    const dept = user.deptId
      ? await this.dataSource.getRepository('sys_dept').findOne({ where: { id: user.deptId } })
      : null;
    return {
      id: Number(user.id),
      username: user.username,
      nickname: user.nickname,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      avatar: user.avatar,
      signature: user.signature,
      deptId: user.deptId ? Number(user.deptId) : null,
      deptName: (dept as { name?: string } | null)?.name || '',
      roles: roles.map((r) => ({ id: Number(r.id), name: r.name, code: r.code })),
      lastLoginAt: user.lastLoginAt,
      loginCount: user.loginCount,
      createdAt: user.createdAt,
      // 会话恢复用：前端刷新后据此恢复权限按钮
      permissions: [...permissions],
      isSuperAdmin,
    };
  }

  /** 前端动态路由：可见菜单树(M/C 层级) + 按钮权限集合 */
  async getRoutes(userId: number) {
    const menus = await this.rbacService.getUserMenus(userId);
    const visible = menus.filter((m) => m.type !== 'F' && m.visible);
    const tree = buildTree(visible.map((m) => ({ ...m, id: Number(m.id), parentId: Number(m.parentId) })));
    return tree;
  }

  async logout(userId: number) {
    this.rbacService.revokeTokens(userId); // 该用户此前签发的 access/refresh 令牌全部失效
    this.rbacService.clearCache(userId);
    return null;
  }

  /** 更新个人资料 */
  async updateProfile(userId: number, dto: { nickname: string; signature?: string; email?: string; phone?: string; gender?: string }) {
    await this.userRepo.update(userId, {
      nickname: dto.nickname,
      signature: dto.signature,
      email: dto.email,
      phone: dto.phone,
      gender: dto.gender,
    });
    return this.profile(userId);
  }

  /** 修改个人密码 */
  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.id = :id AND u.deleted IS NULL', { id: userId })
      .getOne();
    if (!user) throw new UnauthorizedException('用户不存在');
    const ok = await bcrypt.compare(oldPassword, user.password);
    if (!ok) throw new BadRequestException('旧密码不正确');
    await this.userRepo.update(userId, { password: await bcrypt.hash(newPassword, 10) });
    return null;
  }
}
