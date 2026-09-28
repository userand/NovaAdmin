import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthRequest, JwtPayload } from '../decorators/current-user.decorator';
import { RbacService } from '../../modules/rbac/rbac.service';
import { jwtAccessSecret } from '../utils/jwt.util';

/**
 * 全局 JWT 认证守卫：
 * - @Public() 标记的接口免认证
 * - 其余接口必须携带 Authorization: Bearer <accessToken>
 * - 令牌有效之外，还要求账号仍存在且未停用、且令牌未因退出登录被吊销
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('未登录或令牌缺失');

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, { secret: jwtAccessSecret() });
    } catch {
      throw new UnauthorizedException('登录已过期，请重新登录');
    }
    if (payload.type !== 'access') throw new UnauthorizedException('令牌类型错误');
    if (this.rbacService.isTokenRevoked(payload.sub, payload.iat)) {
      throw new UnauthorizedException('登录已失效，请重新登录');
    }
    if (!(await this.rbacService.isUserActive(payload.sub))) {
      throw new UnauthorizedException('账号不存在或已被停用');
    }
    request.user = payload;
    return true;
  }

  private extractToken(request: AuthRequest): string | null {
    const [type, token] = (request.headers.authorization || '').split(' ');
    return type === 'Bearer' && token ? token : null;
  }
}
