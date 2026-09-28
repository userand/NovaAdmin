import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import { OperationLogInterceptor } from '../../common/interceptors/operation-log.interceptor';
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsIn, IsInt, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class SaveMenuDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number;

  @IsString()
  @IsNotEmpty({ message: '菜单名称不能为空' })
  @MaxLength(64)
  name: string;

  @IsString()
  @IsIn(['M', 'C', 'F'], { message: '类型必须为 M/C/F' })
  type: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  component?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  perms?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  icon?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orderNum?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  visible?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  keepAlive?: boolean;

  @IsOptional()
  @IsIn(['0', '1'])
  status?: string;
}

@ApiTags('菜单管理')
@ApiBearerAuth()
@Controller('menus')
@UseInterceptors(OperationLogInterceptor)
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @RequirePermission('system:menu:list')
  @ApiOperation({ summary: '菜单树' })
  findTree(@Query('keyword') keyword?: string) {
    return this.menuService.findTree(keyword);
  }

  @Get(':id')
  @RequirePermission('system:menu:list')
  @ApiOperation({ summary: '菜单详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.findOne(id);
  }

  @Post()
  @RequirePermission('system:menu:create')
  @OperationLog('菜单管理', '新增')
  @ApiOperation({ summary: '新增菜单' })
  create(@Body() dto: SaveMenuDto) {
    return this.menuService.create(dto as never);
  }

  @Put(':id')
  @RequirePermission('system:menu:update')
  @OperationLog('菜单管理', '修改')
  @ApiOperation({ summary: '编辑菜单' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: SaveMenuDto) {
    return this.menuService.update(id, dto as never);
  }

  @Delete(':id')
  @RequirePermission('system:menu:delete')
  @OperationLog('菜单管理', '删除')
  @ApiOperation({ summary: '删除菜单' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.remove(id);
  }
}
