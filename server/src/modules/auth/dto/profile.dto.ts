import { IsOptionalOrEmpty } from '../../../common/decorators/optional-empty.decorator';
import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional, IsEmail, Matches, IsIn } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty({ message: '昵称不能为空' })
  @MaxLength(32)
  nickname: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  signature?: string;

  @IsOptionalOrEmpty()
  @IsString()
  @MaxLength(64)
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;

  @IsOptionalOrEmpty()
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone?: string;

  @IsOptional()
  @IsIn(['0', '1', '2'], { message: '性别取值不合法' })
  gender?: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: '旧密码不能为空' })
  oldPassword: string;

  @IsString()
  @MinLength(8, { message: '新密码至少 8 位' })
  @MaxLength(32)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,32}$/, { message: '新密码须包含字母和数字' })
  newPassword: string;
}
