import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DeptService } from './dept.service';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import { OperationLogInterceptor } from '../../common/interceptors/operation-log.interceptor';
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsIn, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class SaveDeptDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number;

  @IsString()
  @IsNotEmpty({ message: '部门名称不能为空' })
  @MaxLength(64)
  name: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orderNum?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  leader?: string;

  @IsOptional()
  @IsString()
  @MaxLength(18)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  email?: string;

  @IsOptional()
  @IsIn(['0', '1'])
  status?: string;
}

@ApiTags('部门管理')
@ApiBearerAuth()
@Controller('depts')
@UseInterceptors(OperationLogInterceptor)
export class DeptController {
  constructor(private readonly deptService: DeptService) {}

  @Get()
  @RequirePermission('system:dept:list')
  @ApiOperation({ summary: '部门树' })
  findTree(@Query('keyword') keyword?: string, @Query('status') status?: string) {
    return this.deptService.findTree(keyword, status);
  }

  @Get('options')
  @ApiOperation({ summary: '部门下拉选项' })
  options() {
    return this.deptService.findOptions();
  }

  @Post()
  @RequirePermission('system:dept:create')
  @OperationLog('部门管理', '新增')
  @ApiOperation({ summary: '新增部门' })
  create(@Body() dto: SaveDeptDto) {
    return this.deptService.create(dto as never);
  }

  @Put(':id')
  @RequirePermission('system:dept:update')
  @OperationLog('部门管理', '修改')
  @ApiOperation({ summary: '编辑部门' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: SaveDeptDto) {
    return this.deptService.update(id, dto as never);
  }

  @Delete(':id')
  @RequirePermission('system:dept:delete')
  @OperationLog('部门管理', '删除')
  @ApiOperation({ summary: '删除部门' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.deptService.remove(id);
  }
}
