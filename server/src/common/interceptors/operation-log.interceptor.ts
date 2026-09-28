import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { DataSource } from 'typeorm';
import type { Request } from 'express';
import { OperationLogEntity } from '../../entities/operation-log.entity';
import { LOG_METADATA_KEY, LogMetadata } from '../decorators/operation-log.decorator';
import type { AuthRequest } from '../decorators/current-user.decorator';

const SENSITIVE_KEY = /pass(word)?|pwd|secret|token/i;

/** 递归脱敏请求体：密码/密钥/令牌类字段不落库；参数设置类的 { key, value } 按键名判断 */
function maskSensitive(data: unknown, depth = 0): unknown {
  if (depth > 5 || data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map((item) => maskSensitive(item, depth + 1));
  const record = data as Record<string, unknown>;
  const sensitiveConfig = typeof record.key === 'string' && SENSITIVE_KEY.test(record.key);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    out[k] = SENSITIVE_KEY.test(k) || (sensitiveConfig && k === 'value') ? '******' : maskSensitive(v, depth + 1);
  }
  return out;
}

/**
 * 操作审计拦截器：配合 @OperationLog() 装饰器，异步落库写操作日志
 */
@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.getAllAndOverride<LogMetadata>(LOG_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // 只记录被 @OperationLog 标记的接口
    if (!metadata) return next.handle();

    const start = Date.now();
    const request = context.switchToHttp().getRequest<AuthRequest & Request>();
    const { method, originalUrl } = request;
    const ip = request.ip || '';
    const username = request.user?.username || 'anonymous';

    return next.handle().pipe(
      tap({
        next: () => void this.saveLog(metadata, method, originalUrl, ip, username, '0', '', Date.now() - start, request.body),
        error: (err: Error & { status?: number }) =>
          void this.saveLog(metadata, method, originalUrl, ip, username, '1', err.message?.slice(0, 500) || '未知错误', Date.now() - start, request.body),
      }),
    );
  }

  private async saveLog(
    metadata: LogMetadata,
    method: string,
    url: string,
    ip: string,
    username: string,
    status: string,
    errorMsg: string,
    costMs: number,
    params: unknown,
  ) {
    try {
      const logRepo = this.dataSource.getRepository(OperationLogEntity);
      await logRepo.save(
        logRepo.create({
          title: metadata.title,
          action: metadata.action || '',
          method,
          url: url.slice(0, 250),
          params: params ? JSON.stringify(maskSensitive(params)).slice(0, 2000) : undefined,
          ip: ip || '',
          username,
          status,
          errorMsg,
          costMs,
          operTime: new Date(),
        }),
      );
    } catch {
      // 日志落库失败不影响主流程
    }
  }
}
