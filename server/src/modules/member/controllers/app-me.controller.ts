import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { Throttle } from '../../../common/guards/throttle.decorator';
import { ThrottleGuard } from '../../../common/guards/throttle.guard';
import { IMAGE_MAX_SIZE, saveImage } from '../../upload/upload.controller';
import { AppAuthGuard, AppUserId } from '../guards/app-auth.guard';
import { AppAuthService } from '../services/app-auth.service';
import {
  BindCodeSendDto, BindEmailDto, BindPhoneDto, BindWechatDto, ChangePasswordDto, UpdateMeDto,
} from '../dto/app.dto';

/** 移动端 · 我的。需携带会员 accessToken：Authorization: Bearer <accessToken> */
@ApiTags('移动端 · 我的')
@ApiBearerAuth()
@Public()
@Controller('app/me')
@UseGuards(ThrottleGuard, AppAuthGuard)
export class AppMeController {
  constructor(private readonly auth: AppAuthService) {}

  @Get()
  @ApiOperation({ summary: '我的资料(含手机/邮箱/微信绑定情况、是否设置过密码)' })
  me(@AppUserId() userId: number) {
    return this.auth.getMe(userId);
  }

  @Put()
  @ApiOperation({ summary: '修改资料：昵称 / 性别 / 生日 / 头像' })
  update(@AppUserId() userId: number, @Body() dto: UpdateMeDto) {
    return this.auth.updateMe(userId, dto);
  }

  @Post('avatar')
  @HttpCode(200)
  @Throttle(20, 60)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传头像(表单字段 file，≤5MB，jpg/png/gif/webp)，成功后直接更新头像' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: IMAGE_MAX_SIZE } }))
  async avatar(@AppUserId() userId: number, @UploadedFile() file?: Express.Multer.File) {
    const saved = saveImage(file);
    return this.auth.setAvatar(userId, saved.url);
  }

  @Put('password')
  @ApiOperation({ summary: '设置/修改密码(已设置过需带 oldPassword)；返回新令牌，其他设备登录失效' })
  password(@AppUserId() userId: number, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(userId, dto);
  }

  @Post('code/send')
  @HttpCode(200)
  @Throttle(20, 60)
  @ApiOperation({ summary: '给待绑定的手机号/邮箱发送验证码' })
  sendBindCode(@AppUserId() userId: number, @Body() dto: BindCodeSendDto) {
    return this.auth.sendBindCode(userId, dto.target);
  }

  @Post('bind-phone')
  @HttpCode(200)
  @ApiOperation({ summary: '绑定/换绑手机号' })
  bindPhone(@AppUserId() userId: number, @Body() dto: BindPhoneDto) {
    return this.auth.bindPhone(userId, dto);
  }

  @Post('bind-email')
  @HttpCode(200)
  @ApiOperation({ summary: '绑定/换绑邮箱' })
  bindEmail(@AppUserId() userId: number, @Body() dto: BindEmailDto) {
    return this.auth.bindEmail(userId, dto);
  }

  @Post('bind-wechat')
  @HttpCode(200)
  @Throttle(20, 60)
  @ApiOperation({ summary: '绑定微信' })
  bindWechat(@AppUserId() userId: number, @Body() dto: BindWechatDto) {
    return this.auth.bindWechat(userId, dto);
  }

  @Delete('identities/:provider')
  @ApiOperation({ summary: '解绑微信：provider = wechat_mp | wechat_app | wechat_h5(至少保留一种登录方式)' })
  unbind(@AppUserId() userId: number, @Param('provider') provider: string) {
    return this.auth.unbindIdentity(userId, provider);
  }
}
