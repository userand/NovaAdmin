import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** 标记接口为公开访问(免登录)，用于登录/验证码等接口 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
