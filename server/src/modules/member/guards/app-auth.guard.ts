import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import { AppSessionService } from '../services/app-session.service';

type AppRequest = Request & { appUserId?: number };

/**
 * 会员端认证守卫：只接受会员 access 令牌(与后台令牌不通用)，
 * 并实时校验账号存在、未停用、令牌版本一致(踢下线/改密/停用后立即失效)。
 * 使用方式：控制器加 @Public()(跳过后台守卫) + @UseGuards(AppAuthGuard)。
 */
@Injectable()
export class AppAuthGuard implements CanActivate {
  constructor(private readonly session: AppSessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AppRequest>();
    const [type, token] = (req.headers.authorization || '').split(' ');
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('未登录或令牌缺失');
    const payload = await this.session.verify(token, 'access');
    req.appUserId = Number(payload.sub);
    return true;
  }
}

/** 取当前会员 ID */
export const AppUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): number => {
  return Number(ctx.switchToHttp().getRequest<AppRequest>().appUserId);
});
