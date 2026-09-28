import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response, Request } from 'express';

/**
 * 全局异常过滤器：统一错误响应结构 { code, message, data }
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let code = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器开小差了，请稍后重试';

    if (exception instanceof HttpException) {
      code = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (res && typeof res === 'object') {
        const r = res as Record<string, unknown>;
        // class-validator 错误数组 → 取第一条可读消息
        message = Array.isArray(r.message) ? r.message[0] : (r.message as string) || exception.message;
      }
    } else if (exception instanceof Error) {
      // 不把内部异常信息(SQL/堆栈细节)回给客户端，只在日志里保留；唯一键冲突给出可读提示
      if ((exception as { code?: string }).code === 'ER_DUP_ENTRY') {
        code = HttpStatus.BAD_REQUEST;
        message = '数据已存在(账号/编码/键名等唯一字段重复，可能与已删除的记录冲突)';
      }
      this.logger.error(
        `Unhandled exception: ${request.method} ${request.url}`,
        exception.stack,
      );
    }

    response.status(code >= 500 ? HttpStatus.INTERNAL_SERVER_ERROR : code).json({
      code,
      message,
      data: null,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
