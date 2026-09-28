import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import configuration from './config/configuration';

import { RbacModule } from './modules/rbac/rbac.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { RoleModule } from './modules/role/role.module';
import { MenuModule } from './modules/menu/menu.module';
import { DeptModule } from './modules/dept/dept.module';
import { DictModule } from './modules/dict/dict.module';
import { ConfigModule as SysConfigModule } from './modules/config/config.module';
import { LogModule } from './modules/log/log.module';
import { UploadModule } from './modules/upload/upload.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { MemberModule } from './modules/member/member.module';
import { HealthController } from './modules/health/health.controller';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import * as entities from './entities';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], envFilePath: ['.env'] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => ({
        type: 'mysql',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        entities: Object.values(entities),
        autoLoadEntities: true,
        synchronize: false,
        timezone: '+08:00',
        charset: 'utf8mb4',
        extra: { connectionLimit: 10 },
      }),
    }),
    RbacModule,
    AuthModule,
    UserModule,
    RoleModule,
    MenuModule,
    DeptModule,
    DictModule,
    SysConfigModule,
    LogModule,
    UploadModule,
    DashboardModule,
    MemberModule,
  ],
  controllers: [HealthController],
  providers: [JwtAuthGuard, PermissionsGuard],
})
export class AppModule {}
