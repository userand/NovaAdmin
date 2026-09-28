import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface JwtPayload {
  sub: number;
  username: string;
  nickname: string;
  avatar?: string;
  type?: 'access' | 'refresh';
  iat?: number;
}

export interface AuthRequest extends Request {
  user: JwtPayload;
}

/** 从请求中获取当前登录用户信息 */
export const CurrentUser = createParamDecorator(
  (field: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthRequest>();
    const user = request.user;
    return field ? user?.[field] : user;
  },
);
