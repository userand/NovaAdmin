import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { Throttle } from '../../../common/guards/throttle.decorator';
import { ThrottleGuard } from '../../../common/guards/throttle.guard';
import { AppAuthGuard, AppUserId } from '../guards/app-auth.guard';
import { AppAuthService } from '../services/app-auth.service';
import { MemberSettingsService } from '../services/member-settings.service';
import { NotifyService } from '../notify/notify.service';
import { WECHAT_PLATFORMS, WechatService } from '../services/wechat.service';
import { clientContext } from '../member.util';
import {
  EmailLoginDto, LogoutDto, PasswordLoginDto, PhoneLoginDto, RefreshDto, ResetByCodeDto, SendCodeDto, WechatLoginDto,
} from '../dto/app.dto';

/**
 * 移动端 · 认证。所有接口无需后台令牌(@Public)，前缀 /api/app/auth。
 * 建议客户端带上请求头 X-Client: ios | android | mp | h5，用于登录日志。
 */
@ApiTags('移动端 · 认证')
@Public()
@Controller('app/auth')
@UseGuards(ThrottleGuard)
export class AppAuthController {
  constructor(
    private readonly auth: AppAuthService,
    private readonly settings: MemberSettingsService,
    private readonly wechat: WechatService,
    private readonly notify: NotifyService,
  ) {}

  @Get('config')
  @ApiOperation({ summary: '登录页配置：当前开放哪些登录方式(客户端据此渲染登录界面)' })
  async config() {
    const s = await this.settings.all();
    return {
      registerEnabled: s.register,
      methods: {
        phoneCode: s.phone,
        emailCode: s.email,
        password: s.password,
        wechat: s.wechat ? WECHAT_PLATFORMS.filter((p) => this.wechat.configured(p) || this.wechat.mockEnabled) : [],
      },
      // 模拟模式(未接入真实短信/邮件/微信)仅用于开发联调
      sandbox: {
        sms: this.notify.isConsole('phone'),
        email: this.notify.isConsole('email'),
        wechat: this.wechat.mockEnabled,
      },
    };
  }

  @Post('code/send')
  @HttpCode(200)
  @Throttle(20, 60)
  @ApiOperation({ summary: '发送验证码(手机短信/邮件)：登录/注册 或 找回密码' })
  sendCode(@Body() dto: SendCodeDto) {
    return this.auth.sendCode(dto);
  }

  @Post('login/phone')
  @HttpCode(200)
  @Throttle(20, 60)
  @ApiOperation({ summary: '手机号 + 验证码登录(未注册则自动注册)' })
  phoneLogin(@Body() dto: PhoneLoginDto, @Req() req: Request) {
    return this.auth.phoneLogin(dto, clientContext(req));
  }

  @Post('login/email')
  @HttpCode(200)
  @Throttle(20, 60)
  @ApiOperation({ summary: '邮箱 + 验证码登录(未注册则自动注册)' })
  emailLogin(@Body() dto: EmailLoginDto, @Req() req: Request) {
    return this.auth.emailLogin(dto, clientContext(req));
  }

  @Post('login/password')
  @HttpCode(200)
  @Throttle(20, 60)
  @ApiOperation({ summary: '手机号/邮箱 + 密码登录' })
  passwordLogin(@Body() dto: PasswordLoginDto, @Req() req: Request) {
    return this.auth.passwordLogin(dto, clientContext(req));
  }

  @Post('login/wechat')
  @HttpCode(200)
  @Throttle(20, 60)
  @ApiOperation({ summary: '微信登录(小程序 mp / 移动应用 app / 公众号 h5)，首次自动注册' })
  wechatLogin(@Body() dto: WechatLoginDto, @Req() req: Request) {
    return this.auth.wechatLogin(dto, clientContext(req));
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle(60, 60)
  @ApiOperation({ summary: '刷新令牌(同时轮换 refreshToken)' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('password/reset')
  @HttpCode(200)
  @Throttle(10, 60)
  @ApiOperation({ summary: '找回密码：验证码 + 新密码(成功后所有设备登录失效)' })
  resetPassword(@Body() dto: ResetByCodeDto) {
    return this.auth.resetPasswordByCode(dto);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '退出登录；all=true 时让该账号所有设备的登录失效' })
  logout(@AppUserId() userId: number, @Body() dto: LogoutDto) {
    return this.auth.logout(userId, dto?.all === true);
  }
}
