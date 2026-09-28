import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthRequest } from '../../common/decorators/current-user.decorator';
import type { Request } from 'express';
import { LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { UpdateProfileDto, ChangePasswordDto } from './dto/profile.dto';
import { Throttle } from '../../common/guards/throttle.decorator';
import { ThrottleGuard } from '../../common/guards/throttle.guard';

@ApiTags('认证 Auth')
@ApiBearerAuth()
@Controller('auth')
@UseGuards(ThrottleGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('captcha')
  @Throttle(30, 60) // 每 60 秒最多 30 次
  @ApiOperation({ summary: '获取图形验证码' })
  getCaptcha() {
    return this.authService.getCaptcha();
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle(10, 60) // 防爆破：每 60 秒最多 10 次尝试
  @ApiOperation({ summary: '账号密码登录' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req as AuthRequest);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: '刷新访问令牌' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get('profile')
  @ApiOperation({ summary: '获取当前登录用户信息' })
  profile(@CurrentUser('sub') userId: number) {
    return this.authService.profile(Number(userId));
  }

  @Get('routes')
  @ApiOperation({ summary: '获取当前用户动态菜单路由' })
  routes(@CurrentUser('sub') userId: number) {
    return this.authService.getRoutes(Number(userId));
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: '退出登录' })
  logout(@CurrentUser('sub') userId: number) {
    return this.authService.logout(Number(userId));
  }

  @Put('profile')
  @ApiOperation({ summary: '更新个人资料' })
  updateProfile(@CurrentUser('sub') userId: number, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(Number(userId), dto);
  }

  @Put('password')
  @ApiOperation({ summary: '修改个人密码' })
  changePassword(@CurrentUser('sub') userId: number, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(Number(userId), dto.oldPassword, dto.newPassword);
  }
}
