import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotifyService } from './notify/notify.service';
import { AppAuthGuard } from './guards/app-auth.guard';
import { AppAuthService } from './services/app-auth.service';
import { AppSessionService } from './services/app-session.service';
import { MemberService } from './services/member.service';
import { MemberSettingsService } from './services/member-settings.service';
import { VerifyCodeService } from './services/verify-code.service';
import { WechatService } from './services/wechat.service';
import { AppAuthController } from './controllers/app-auth.controller';
import { AppMeController } from './controllers/app-me.controller';
import { MemberController } from './controllers/member.controller';

/**
 * 会员中心：C 端用户体系(与后台 sys_user 独立)。
 * - 移动端接口  /api/app/auth/*  /api/app/me/*
 * - 后台管理    /api/members/*
 */
@Module({
  imports: [JwtModule.register({})],
  controllers: [AppAuthController, AppMeController, MemberController],
  providers: [
    NotifyService, VerifyCodeService, MemberSettingsService, WechatService,
    AppSessionService, AppAuthGuard, AppAuthService, MemberService,
  ],
})
export class MemberModule {}
