import { IsOptional, IsString, IsNotEmpty, MaxLength, IsEmail, Matches, IsIn, IsArray, IsInt, Min, Max, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { IsOptionalOrEmpty } from '../../../common/decorators/optional-empty.decorator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class QueryUserDto {
  @ApiPropertyOptional({ description: '关键词(账号/昵称/手机号)' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '部门ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  deptId?: number;

  @ApiPropertyOptional({ description: '状态 0正常 1停用' })
  @IsOptional()
  @IsIn(['0', '1'])
  status?: string;

  @ApiPropertyOptional({ description: '创建开始日期 YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  beginDate?: string;

  @ApiPropertyOptional({ description: '创建结束日期' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;
}

export class CreateUserDto {
  @ApiProperty({ description: '登录账号' })
  @IsString()
  @IsNotEmpty({ message: '账号不能为空' })
  @MaxLength(32)
  @Matches(/^[a-zA-Z][a-zA-Z0-9_]{2,31}$/, { message: '账号须以字母开头，3-32位字母数字下划线' })
  username: string;

  @ApiProperty({ description: '用户昵称' })
  @IsString()
  @IsNotEmpty({ message: '昵称不能为空' })
  @MaxLength(32)
  nickname: string;

  @ApiPropertyOptional()
  @IsOptionalOrEmpty()
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(64)
  email?: string;

  @ApiPropertyOptional()
  @IsOptionalOrEmpty()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone?: string;

  @ApiPropertyOptional({ description: '性别 0未知 1男 2女' })
  @IsOptional()
  @IsIn(['0', '1', '2'])
  gender?: string;

  @ApiPropertyOptional({ description: '密码(留空使用系统初始密码)' })
  @IsOptionalOrEmpty()
  @IsString()
  @MinLength(8, { message: '密码至少 8 位' })
  @MaxLength(32)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,32}$/, { message: '密码须包含字母和数字' })
  password?: string;

  @ApiPropertyOptional({ description: '部门ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  deptId?: number;

  @ApiPropertyOptional({ description: '角色ID列表', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  roleIds?: number[];

  @ApiPropertyOptional({ description: '状态' })
  @IsOptional()
  @IsIn(['0', '1'])
  status?: string;
}

export class UpdateUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: '昵称不能为空' })
  @MaxLength(32)
  nickname: string;

  @ApiPropertyOptional()
  @IsOptionalOrEmpty()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;

  @ApiPropertyOptional()
  @IsOptionalOrEmpty()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['0', '1', '2'])
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  deptId?: number;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  roleIds?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['0', '1'])
  status?: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: '新密码' })
  @IsString()
  @IsNotEmpty({ message: '新密码不能为空' })
  @MinLength(8, { message: '密码至少 8 位' })
  @MaxLength(32)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,32}$/, { message: '密码须包含字母和数字' })
  password: string;
}
