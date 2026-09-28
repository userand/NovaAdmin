import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DictService } from './dict.service';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import { OperationLogInterceptor } from '../../common/interceptors/operation-log.interceptor';
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsIn, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class SaveTypeDto {
  @IsString() @IsNotEmpty({ message: '字典名称不能为空' }) @MaxLength(64)
  name: string;
  @IsString() @IsNotEmpty({ message: '字典编码不能为空' }) @MaxLength(64)
  code: string;
  @IsOptional() @IsIn(['0', '1']) status?: string;
  @IsOptional() @IsString() @MaxLength(255) remark?: string;
}

class SaveDataDto {
  @IsString() @IsNotEmpty() @MaxLength(64)
  typeCode: string;
  @IsString() @IsNotEmpty({ message: '标签不能为空' }) @MaxLength(64)
  label: string;
  @IsString() @IsNotEmpty({ message: '键值不能为空' }) @MaxLength(64)
  value: string;
  @IsOptional() @IsString() @MaxLength(32) tagType?: string;
  @IsOptional() @Type(() => Number) @IsInt() orderNum?: number;
  @IsOptional() @IsIn(['0', '1']) status?: string;
  @IsOptional() @IsString() @MaxLength(255) remark?: string;
}

@ApiTags('字典管理')
@ApiBearerAuth()
@Controller('dict')
@UseInterceptors(OperationLogInterceptor)
export class DictController {
  constructor(private readonly dictService: DictService) {}

  @Get('types')
  @RequirePermission('system:dict:list')
  @ApiOperation({ summary: '字典类型分页' })
  findTypes(@Query('keyword') keyword?: string, @Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.dictService.findTypes(keyword, page, pageSize);
  }

  @Get('map')
  @ApiOperation({ summary: '按编码批量获取字典数据' })
  getMap(@Query('codes') codes?: string) {
    return this.dictService.getDictMap(codes ? codes.split(',') : []);
  }

  @Post('types')
  @RequirePermission('system:dict:create')
  @OperationLog('字典管理', '新增类型')
  createType(@Body() dto: SaveTypeDto) {
    return this.dictService.createType(dto);
  }

  @Put('types/:id')
  @RequirePermission('system:dict:update')
  @OperationLog('字典管理', '修改类型')
  updateType(@Param('id', ParseIntPipe) id: number, @Body() dto: SaveTypeDto) {
    return this.dictService.updateType(id, dto);
  }

  @Delete('types/:id')
  @RequirePermission('system:dict:delete')
  @OperationLog('字典管理', '删除类型')
  removeType(@Param('id', ParseIntPipe) id: number) {
    return this.dictService.removeType(id);
  }

  @Get('datas')
  @RequirePermission('system:dict:list')
  @ApiOperation({ summary: '字典数据列表' })
  findDatas(@Query('typeCode') typeCode: string, @Query('keyword') keyword?: string) {
    return this.dictService.findDatas(typeCode, keyword);
  }

  @Post('datas')
  @RequirePermission('system:dict:create')
  @OperationLog('字典管理', '新增数据')
  createData(@Body() dto: SaveDataDto) {
    return this.dictService.createData(dto as never);
  }

  @Put('datas/:id')
  @RequirePermission('system:dict:update')
  @OperationLog('字典管理', '修改数据')
  updateData(@Param('id', ParseIntPipe) id: number, @Body() dto: SaveDataDto) {
    return this.dictService.updateData(id, dto as never);
  }

  @Delete('datas/:id')
  @RequirePermission('system:dict:delete')
  @OperationLog('字典管理', '删除数据')
  removeData(@Param('id', ParseIntPipe) id: number) {
    return this.dictService.removeData(id);
  }
}
