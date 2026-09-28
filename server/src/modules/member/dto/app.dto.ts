import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptionalOrEmpty } from '../../../common/decorators/optional-empty.decorator';
import { EMAIL_RE, PASSWORD_RE, PHONE_RE } from '../member.util';

const PASSWORD_MSG = '密码须为 8-32 位，且同时包含字母和数字';

export class SendCodeDto {
  @ApiProperty({ enum: ['login', 'reset'], description: '用途：login 登录/注册，reset 找回密码' })
  @IsIn(['login', 'reset'], { message: 'scene 仅支持 login / reset' })
  scene: 'login' | 'reset';

  @ApiProperty({ description: '手机号或邮箱', example: '13800000000' })
  @IsString() @IsNotEmpty({ message: '请输入手机号或邮箱' }) @MaxLength(128)
  target: string;
}

export class PhoneLoginDto {
  @ApiProperty({ example: '13800000000' })
  @Matches(PHONE_RE, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/, { message: '请输入 6 位数字验证码' })
  code: string;
}

export class EmailLoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @Matches(EMAIL_RE, { message: '邮箱格式不正确' }) @MaxLength(128)
  email: string;

  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/, { message: '请输入 6 位数字验证码' })
  code: string;
}

export class PasswordLoginDto {
  @ApiProperty({ description: '手机号或邮箱' })
  @IsString() @IsNotEmpty({ message: '请输入手机号或邮箱' }) @MaxLength(128)
  account: string;

  @ApiProperty()
  @IsString() @IsNotEmpty({ message: '请输入密码' }) @MaxLength(64)
  password: string;
}

export class WechatLoginDto {
  @ApiProperty({ enum: ['mp', 'app', 'h5'], description: 'mp 小程序 / app 移动应用 / h5 公众号网页授权' })
  @IsIn(['mp', 'app', 'h5'], { message: 'platform 仅支持 mp / app / h5' })
  platform: 'mp' | 'app' | 'h5';

  @ApiProperty({ description: '微信授权返回的 code' })
  @IsString() @IsNotEmpty({ message: '缺少微信授权 code' }) @MaxLength(256)
  code: string;

  @ApiPropertyOptional({ description: '首次注册时使用的昵称(小程序需用户授权后由前端传入)' })
  @IsOptional() @IsString() @MaxLength(64)
  nickname?: string;

  @ApiPropertyOptional({ description: '首次注册时使用的头像地址' })
  @IsOptional() @IsString() @MaxLength(255)
  avatar?: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString() @IsNotEmpty({ message: 'refreshToken 不能为空' })
  refreshToken: string;
}

export class ResetByCodeDto {
  @ApiProperty({ description: '手机号或邮箱' })
  @IsString() @IsNotEmpty() @MaxLength(128)
  target: string;

  @ApiProperty()
  @Matches(/^\d{6}$/, { message: '请输入 6 位数字验证码' })
  code: string;

  @ApiProperty()
  @IsString() @Matches(PASSWORD_RE, { message: PASSWORD_MSG })
  newPassword: string;
}

export class UpdateMeDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MinLength(1) @MaxLength(32)
  nickname?: string;

  @ApiPropertyOptional({ description: '0未知 1男 2女' })
  @IsOptional() @IsIn(['0', '1', '2'])
  gender?: string;

  @ApiPropertyOptional({ example: '1995-06-01' })
  @IsOptionalOrEmpty() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '生日格式应为 YYYY-MM-DD' })
  birthday?: string;

  @ApiPropertyOptional({ description: '头像地址(通常来自 POST /app/me/avatar 的返回值)' })
  @IsOptional() @IsString() @MaxLength(255)
  avatar?: string;
}

export class ChangePasswordDto {
  @ApiPropertyOptional({ description: '已设置过密码时必填' })
  @IsOptional() @IsString() @MaxLength(64)
  oldPassword?: string;

  @ApiProperty()
  @IsString() @Matches(PASSWORD_RE, { message: PASSWORD_MSG })
  newPassword: string;
}

export class BindCodeSendDto {
  @ApiProperty({ description: '要绑定的手机号或邮箱' })
  @IsString() @IsNotEmpty() @MaxLength(128)
  target: string;
}

export class BindPhoneDto {
  @ApiProperty() @Matches(PHONE_RE, { message: '手机号格式不正确' })
  phone: string;
  @ApiProperty() @Matches(/^\d{6}$/, { message: '请输入 6 位数字验证码' })
  code: string;
}

export class BindEmailDto {
  @ApiProperty() @Matches(EMAIL_RE, { message: '邮箱格式不正确' }) @MaxLength(128)
  email: string;
  @ApiProperty() @Matches(/^\d{6}$/, { message: '请输入 6 位数字验证码' })
  code: string;
}

export class BindWechatDto {
  @ApiProperty({ enum: ['mp', 'app', 'h5'] })
  @IsIn(['mp', 'app', 'h5'])
  platform: 'mp' | 'app' | 'h5';

  @ApiProperty()
  @IsString() @IsNotEmpty() @MaxLength(256)
  code: string;
}

export class LogoutDto {
  @ApiPropertyOptional({ description: 'true=让该账号所有设备的登录一并失效' })
  @IsOptional()
  all?: boolean;
}
