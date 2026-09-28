import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import helmet from 'helmet';
import compression from 'compression';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import type { Request, Response, NextFunction } from 'express';

/**
 * 空查询参数清洗(middleware)：
 * 前端表单常携带 keyword=''/status='' 等空值，此处统一剔除，
 * 避免空字符串触发 @IsIn/@IsInt 校验失败。必须在 Nest 参数提取前执行。
 */
function stripEmptyQuery(req: Request, _res: Response, next: NextFunction) {
  if (req.query && typeof req.query === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(req.query)) {
      const isEmpty = value === '' || value === 'undefined' || value === 'null' || value === undefined;
      if (!isEmpty) cleaned[key] = value;
    }
    Object.defineProperty(req, 'query', { value: cleaned, writable: true, configurable: true });
  }
  next();
}

/**
 * 生产环境启动前自检：使用开发默认值/过短的密钥直接拒绝启动，避免"忘了改"导致令牌可被伪造。
 */
function assertProductionSecrets() {
  if (process.env.NODE_ENV !== 'production') return;
  const weak = (v?: string) => !v || v.length < 16 || /nova-admin-dev|nova-secret|nova-refresh|change[-_]?me/i.test(v);
  const problems: string[] = [];
  if (weak(process.env.JWT_SECRET)) problems.push('JWT_SECRET');
  if (weak(process.env.JWT_REFRESH_SECRET)) problems.push('JWT_REFRESH_SECRET');
  if (process.env.JWT_SECRET && process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) problems.push('JWT_SECRET 与 JWT_REFRESH_SECRET 不能相同');
  if (!process.env.DB_PASS || process.env.DB_PASS === 'root') problems.push('DB_PASS');
  if (problems.length) {
    throw new Error(`生产环境配置不安全，拒绝启动：${problems.join('、')} 未设置或使用了默认/过弱的值(密钥至少 16 位随机字符)`);
  }
}

async function bootstrap() {
  assertProductionSecrets();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: false });
  const config = app.get(ConfigService);

  // 部署在 Nginx/负载均衡之后时设置 TRUST_PROXY(如 1 = 信任前一跳)，
  // 这样 req.ip 才是真实客户端 IP(限流、登录日志都依赖它)；直接暴露公网时不要设置。
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy === 'true' ? true : trustProxy);

  // ===== 安全 & 性能 =====
  app.use(stripEmptyQuery);
  app.use(
    helmet({
      contentSecurityPolicy: false, // 兼容 Swagger UI / 本地开发
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression());
  app.enableCors({
    origin: config.get<string[]>('cors.origin'),
    credentials: true,
  });

  // ===== 全局前缀 & 校验 =====
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // 剥离未声明属性，防参数污染
      transform: true,          // 类型自动转换(配合 @Type)
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ===== 全局守卫/过滤器/拦截器 =====
  app.useGlobalGuards(app.get(JwtAuthGuard), app.get(PermissionsGuard));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // ===== 静态资源(上传文件) =====
  // 上传目录仅作图片展示：禁止嗅探、沙箱化，即使混入 html/svg 也不会在同源下执行脚本
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/api/uploads',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; sandbox");
    },
  });

  // ===== Swagger 文档 =====
  if (config.get<boolean>('swaggerEnabled')) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Nova Admin API')
      .setDescription('商业级中后台基础框架接口文档 · NestJS + TypeORM + MySQL')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = config.get<number>('port') || 3200;
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(`🚀 Nova Admin Server running at http://localhost:${port}`);
  if (config.get<boolean>('swaggerEnabled')) {
    new Logger('Bootstrap').log(`📘 Swagger docs at http://localhost:${port}/api/docs`);
  }
}
bootstrap();
