import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Response, Request } from 'express';

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}

/** 统一成功响应包装：{ code: 0, message: 'ok', data } */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiEnvelope<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiEnvelope<T>> {
    const http = context.switchToHttp();
    void http.getResponse<Response>();
    void http.getRequest<Request>();
    return next.handle().pipe(
      map((data) => ({
        code: 0,
        message: 'ok',
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
