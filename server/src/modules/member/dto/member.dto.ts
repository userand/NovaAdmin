import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptionalOrEmpty } from '../../../common/decorators/optional-empty.decorator';
import { EMAIL_RE, PASSWORD_RE, PHONE_RE } from '../member.util';

class PageDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize = 10;
}

export class QueryMemberDto extends PageDto {
  @ApiPropertyOptional({ description: '昵称 / 手机号 / 邮箱' })
  @IsOptional() @IsString() @MaxLength(64)
  keyword?: string;

  @ApiPropertyOptional({ description: '0正常 1停用' })
  @IsOptional() @IsIn(['0', '1'])
  status?: string;

  @ApiPropertyOptional({ description: '注册来源 phone/email/wechat/admin' })
  @IsOptional() @IsIn(['phone', 'email', 'wechat', 'admin'])
  source?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  beginDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  endDate?: string;
}

export class CreateMemberDto {
  @ApiProperty() @IsString() @IsNotEmpty({ message: '昵称不能为空' }) @MaxLength(32)
  nickname: string;

  @ApiPropertyOptional() @IsOptionalOrEmpty() @Matches(PHONE_RE, { message: '手机号格式不正确' })
  phone?: string;

  @ApiPropertyOptional() @IsOptionalOrEmpty() @Matches(EMAIL_RE, { message: '邮箱格式不正确' }) @MaxLength(128)
  email?: string;

  @ApiPropertyOptional({ description: '留空则不设置密码(会员可用验证码登录)' })
  @IsOptionalOrEmpty() @IsString() @Matches(PASSWORD_RE, { message: '密码须为 8-32 位，且同时包含字母和数字' })
  password?: string;

  @ApiPropertyOptional() @IsOptional() @IsIn(['0', '1', '2'])
  gender?: string;

  @ApiPropertyOptional() @IsOptional() @IsIn(['0', '1'])
  status?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255)
  remark?: string;
}

export class UpdateMemberDto {
  @ApiProperty() @IsString() @IsNotEmpty({ message: '昵称不能为空' }) @MaxLength(32)
  nickname: string;

  @ApiPropertyOptional({ description: '传空字符串表示清除' })
  @IsOptionalOrEmpty() @Matches(PHONE_RE, { message: '手机号格式不正确' })
  phone?: string;

  @ApiPropertyOptional({ description: '传空字符串表示清除' })
  @IsOptionalOrEmpty() @Matches(EMAIL_RE, { message: '邮箱格式不正确' }) @MaxLength(128)
  email?: string;

  @ApiPropertyOptional() @IsOptional() @IsIn(['0', '1', '2'])
  gender?: string;

  @ApiPropertyOptional() @IsOptional() @IsIn(['0', '1'])
  status?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255)
  remark?: string;
}

export class MemberResetPasswordDto {
  @ApiProperty() @IsString() @Matches(PASSWORD_RE, { message: '密码须为 8-32 位，且同时包含字母和数字' })
  password: string;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() register?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() phone?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() email?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() password?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() wechat?: boolean;
}

export class QueryMemberLogDto extends PageDto {
  @ApiPropertyOptional({ description: '账号 / IP / 会员昵称' })
  @IsOptional() @IsString() @MaxLength(64)
  keyword?: string;

  @ApiPropertyOptional() @IsOptional() @IsIn(['phone_code', 'email_code', 'password', 'wechat'])
  method?: string;

  @ApiPropertyOptional() @IsOptional() @IsIn(['0', '1'])
  status?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  beginDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  endDate?: string;
}
