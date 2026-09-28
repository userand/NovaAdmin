import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: '账号不能为空' })
  @MaxLength(32)
  username: string;

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @MaxLength(64)
  password: string;

  /** 验证码 uuid(36 位)，校验失败时提示 */
  @IsString()
  @IsNotEmpty({ message: '验证码已失效，请刷新后重试' })
  @MaxLength(64)
  captchaId: string;

  /** 验证码文本(4 位) */
  @IsString()
  @IsNotEmpty({ message: '验证码不能为空' })
  @MaxLength(8)
  captchaCode: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'refreshToken 不能为空' })
  refreshToken: string;
}
