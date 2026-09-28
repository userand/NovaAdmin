import { Module } from '@nestjs/common';
import { ConfigController, NoticeController } from './config.controller';
import { ConfigService, NoticeService } from './config.service';

@Module({
  controllers: [ConfigController, NoticeController],
  providers: [ConfigService, NoticeService],
})
export class ConfigModule {}
