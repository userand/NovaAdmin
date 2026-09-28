import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

interface Bucket {
  timestamps: number[];
}

/**
 * 内存滑动窗口限流守卫(单机)：保护登录/验证码等敏感接口
 * 分布式部署请替换为 Redis + 令牌桶实现
 */
@Injectable()
export class ThrottleGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rule = this.reflector.getAllAndOverride<{ limit: number; ttlSeconds: number }>(
      'throttle',
      [context.getHandler(), context.getClass()],
    );
    if (!rule) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const key = `${request.ip || 'unknown'}:${request.path}`;
    const now = Date.now();
    const windowMs = rule.ttlSeconds * 1000;

    const bucket = this.buckets.get(key) || { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

    if (bucket.timestamps.length >= rule.limit) {
      throw new HttpException('请求过于频繁，请稍后再试', HttpStatus.TOO_MANY_REQUESTS);
    }
    bucket.timestamps.push(now);
    this.buckets.set(key, bucket);

    // 清理空桶防止内存泄漏
    if (this.buckets.size > 10000) {
      this.buckets.forEach((b, k) => {
        if (!b.timestamps.some((t) => now - t < windowMs)) this.buckets.delete(k);
      });
    }
    return true;
  }
}
