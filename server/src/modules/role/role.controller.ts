import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoleService } from './role.service';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import { OperationLogInterceptor } from '../../common/interceptors/operation-log.interceptor';
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsIn, IsArray, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SaveRoleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: '角色名称不能为空' })
  @MaxLength(32)
  name: string;

  @ApiProperty({ description: '角色编码，如 operator' })
  @IsString()
  @IsNotEmpty({ message: '角色编码不能为空' })
  @MaxLength(64)
  code: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orderNum?: number;

  @ApiPropertyOptional({ description: '数据范围 1/3/4/5' })
  @IsOptional()
  @IsIn(['1', '3', '4', '5'])
  dataScope?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['0', '1'])
  status?: string;

  @ApiPropertyOptional({ type: [Number], description: '菜单权限ID列表' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  menuIds?: number[];
}

@ApiTags('角色管理')
@ApiBearerAuth()
@Controller('roles')
@UseInterceptors(OperationLogInterceptor)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @RequirePermission('system:role:list')
  @ApiOperation({ summary: '分页查询角色列表' })
  findAll(
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
  ) {
    return this.roleService.findAll(keyword, status, page, pageSize);
  }

  @Get('options')
  @ApiOperation({ summary: '角色下拉选项(全部可用角色)' })
  options() {
    return this.roleService.findAllSimple();
  }

  @Get('menu-tree')
  @RequirePermission('system:role:list')
  @ApiOperation({ summary: '全量菜单树(分配权限用)' })
  menuTree() {
    return this.roleService.getMenuTree();
  }

  @Get(':id')
  @RequirePermission('system:role:list')
  @ApiOperation({ summary: '角色详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.findOne(id);
  }

  @Post()
  @RequirePermission('system:role:create')
  @OperationLog('角色管理', '新增')
  @ApiOperation({ summary: '新增角色' })
  create(@Body() dto: SaveRoleDto) {
    return this.roleService.create(dto);
  }

  @Put(':id')
  @RequirePermission('system:role:update')
  @OperationLog('角色管理', '修改')
  @ApiOperation({ summary: '编辑角色' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: SaveRoleDto) {
    return this.roleService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('system:role:delete')
  @OperationLog('角色管理', '删除')
  @ApiOperation({ summary: '删除角色' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.remove(id);
  }
}
