import { SetMetadata } from '@nestjs/common';

export const THROTTLE_KEY = 'throttle';

/** 接口限流注解：limit 次 / ttlSeconds 秒 */
export const Throttle = (limit: number, ttlSeconds: number) =>
  SetMetadata(THROTTLE_KEY, { limit, ttlSeconds });
