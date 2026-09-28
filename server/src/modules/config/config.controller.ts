import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService, NoticeService } from './config.service';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import { OperationLogInterceptor } from '../../common/interceptors/operation-log.interceptor';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsIn } from 'class-validator';

class SaveConfigDto {
  @IsString() @IsNotEmpty({ message: '参数名称不能为空' }) @MaxLength(64)
  name: string;
  @IsString() @IsNotEmpty({ message: '参数键名不能为空' }) @MaxLength(64)
  key: string;
  @IsString() @MaxLength(255)
  value: string;
  @IsOptional() @IsString() @MaxLength(255) remark?: string;
}

class SaveNoticeDto {
  @IsString() @IsNotEmpty({ message: '标题不能为空' }) @MaxLength(128)
  title: string;
  @IsString() @IsIn(['1', '2'])
  type: string;
  @IsOptional() @IsString()
  content?: string;
  @IsOptional() @IsIn(['0', '1']) status?: string;
  @IsOptional() @IsIn(['true', 'false', '1', '0'])
  top?: string;
}

@ApiTags('参数配置')
@ApiBearerAuth()
@Controller('configs')
@UseInterceptors(OperationLogInterceptor)
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @RequirePermission('system:config:list')
  @ApiOperation({ summary: '参数分页列表' })
  findAll(@Query('keyword') keyword?: string, @Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.configService.findAll(keyword, page, pageSize);
  }

  @Post()
  @RequirePermission('system:config:create')
  @OperationLog('参数设置', '新增')
  create(@Body() dto: SaveConfigDto) {
    return this.configService.create(dto);
  }

  @Put(':id')
  @RequirePermission('system:config:update')
  @OperationLog('参数设置', '修改')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: SaveConfigDto) {
    return this.configService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('system:config:delete')
  @OperationLog('参数设置', '删除')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.configService.remove(id);
  }

  @Post('refresh-cache')
  @RequirePermission('system:config:list')
  @OperationLog('参数设置', '刷新缓存')
  refreshCache() {
    return this.configService.refreshCache();
  }
}

@ApiTags('通知公告')
@ApiBearerAuth()
@Controller('notices')
@UseInterceptors(OperationLogInterceptor)
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) {}

  @Get()
  @RequirePermission('system:notice:list')
  @ApiOperation({ summary: '通知公告分页' })
  findAll(
    @Query('keyword') keyword?: string,
    @Query('type') type?: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
  ) {
    return this.noticeService.findAll(keyword, type, page, pageSize);
  }

  @Get('latest')
  @ApiOperation({ summary: '最新通知(首页卡片用)' })
  latest(@Query('limit') limit = 5) {
    return this.noticeService.latest(limit);
  }

  @Post()
  @RequirePermission('system:notice:create')
  @OperationLog('通知公告', '新增')
  create(@Body() dto: SaveNoticeDto, @CurrentUser('username') username: string) {
    return this.noticeService.create(
      { title: dto.title, type: dto.type, content: dto.content, status: dto.status || '0', top: dto.top === 'true' || dto.top === '1' },
      username,
    );
  }

  @Put(':id')
  @RequirePermission('system:notice:update')
  @OperationLog('通知公告', '修改')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: SaveNoticeDto) {
    return this.noticeService.update(id, {
      title: dto.title, type: dto.type, content: dto.content,
      status: dto.status || '0', top: dto.top === 'true' || dto.top === '1',
    });
  }

  @Delete(':id')
  @RequirePermission('system:notice:delete')
  @OperationLog('通知公告', '删除')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.noticeService.remove(id);
  }
}
