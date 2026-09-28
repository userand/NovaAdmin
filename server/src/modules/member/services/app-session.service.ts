import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { AppUserEntity } from '../../../entities';
import { jwtAccessSecret, jwtRefreshSecret } from '../../../common/utils/jwt.util';

export interface AppTokenPayload {
  sub: number;
  type: 'app_access' | 'app_refresh';
  /** 令牌版本：与 app_user.token_version 不一致即失效(踢下线/改密/停用) */
  tv: number;
  iat?: number;
}

export interface AppTokens {
  accessToken: string;
  refreshToken: string;
  /** access 令牌有效期(秒)，客户端据此提前刷新 */
  expiresIn: number;
}

const SESSION_CACHE_MS = 20 * 1000;

const accessSecret = () => `${jwtAccessSecret()}:app`;
const refreshSecret = () => `${jwtRefreshSecret()}:app`;
const accessExpires = () => process.env.APP_JWT_EXPIRES || '2h';
const refreshExpires = () => process.env.APP_JWT_REFRESH_EXPIRES || '30d';

function toSeconds(v: string): number {
  const m = /^(\d+)([smhd])$/.exec(v);
  if (!m) return 7200;
  return Number(m[1]) * { s: 1, m: 60, h: 3600, d: 86400 }[m[2] as 's' | 'm' | 'h' | 'd'];
}

/**
 * 会员令牌：与后台令牌使用不同的签名密钥和 type，互相不能通用。
 * 令牌版本(token_version)落库，因此"踢下线/改密/停用"在重启后依然有效。
 */
@Injectable()
export class AppSessionService {
  private readonly cache = new Map<number, { status: string; tv: number; at: number }>();

  constructor(
    private readonly jwt: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  async issue(user: Pick<AppUserEntity, 'id' | 'tokenVersion'>): Promise<AppTokens> {
    const base = { sub: Number(user.id), tv: user.tokenVersion };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync({ ...base, type: 'app_access' }, { secret: accessSecret(), expiresIn: accessExpires() as never }),
      this.jwt.signAsync({ ...base, type: 'app_refresh' }, { secret: refreshSecret(), expiresIn: refreshExpires() as never }),
    ]);
    return { accessToken, refreshToken, expiresIn: toSeconds(accessExpires()) };
  }

  async verify(token: string, kind: 'access' | 'refresh'): Promise<AppTokenPayload> {
    let payload: AppTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AppTokenPayload>(token, {
        secret: kind === 'access' ? accessSecret() : refreshSecret(),
      });
    } catch {
      throw new UnauthorizedException(kind === 'access' ? '登录已过期，请重新登录' : '刷新令牌无效或已过期，请重新登录');
    }
    if (payload.type !== (kind === 'access' ? 'app_access' : 'app_refresh')) throw new UnauthorizedException('令牌类型错误');

    const session = await this.getSession(payload.sub);
    if (!session) throw new UnauthorizedException('账号不存在或已注销');
    if (session.status !== '0') throw new UnauthorizedException('账号已被停用');
    if (session.tv !== payload.tv) throw new UnauthorizedException('登录已失效，请重新登录');
    return payload;
  }

  private async getSession(userId: number) {
    const hit = this.cache.get(Number(userId));
    if (hit && Date.now() - hit.at < SESSION_CACHE_MS) return hit;
    const rows: { status: string; token_version: number }[] = await this.dataSource.query(
      `SELECT status, token_version FROM app_user WHERE id = ? AND deleted IS NULL`,
      [Number(userId)],
    );
    if (!rows.length) {
      this.cache.delete(Number(userId));
      return null;
    }
    const entry = { status: rows[0].status, tv: Number(rows[0].token_version), at: Date.now() };
    this.cache.set(Number(userId), entry);
    return entry;
  }

  /** 会员数据变更(停用/改密/踢下线/删除)后调用，使缓存立即失效 */
  invalidate(userId: number) {
    this.cache.delete(Number(userId));
  }
}
