import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const databaseProvider = {
  provide: 'DATABASE_CONFIG',
  useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
    type: 'mysql',
    host: configService.get<string>('database.host'),
    port: configService.get<number>('database.port'),
    username: configService.get<string>('database.username'),
    password: configService.get<string>('database.password'),
    database: configService.get<string>('database.database'),
    autoLoadEntities: true,
    synchronize: configService.get<boolean>('database.synchronize'),
    timezone: '+08:00',
    charset: 'utf8mb4',
    extra: {
      poolSize: 10,
      connectionLimit: 10,
    },
  }),
  inject: [ConfigService],
};
