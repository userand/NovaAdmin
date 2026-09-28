import {
  Controller, Delete, Get, Post, Query, UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LogService } from './log.service';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import { OperationLogInterceptor } from '../../common/interceptors/operation-log.interceptor';

@ApiTags('日志管理')
@ApiBearerAuth()
@Controller('logs')
@UseInterceptors(OperationLogInterceptor)
export class LogController {
  constructor(private readonly logService: LogService) {}

  @Get('login')
  @RequirePermission('system:log:list')
  @ApiOperation({ summary: '登录日志分页' })
  loginLogs(
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
    @Query('beginDate') beginDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
  ) {
    return this.logService.findLoginLogs({ keyword, status, beginDate, endDate, page: Number(page), pageSize: Number(pageSize) });
  }

  @Get('operation')
  @RequirePermission('system:log:list')
  @ApiOperation({ summary: '操作日志分页' })
  operationLogs(
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
    @Query('beginDate') beginDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
  ) {
    return this.logService.findOperationLogs({ keyword, status, beginDate, endDate, page: Number(page), pageSize: Number(pageSize) });
  }

  @Post('login/clear')
  @RequirePermission('system:log:delete')
  @OperationLog('日志管理', '清空登录日志')
  @ApiOperation({ summary: '清空登录日志' })
  clearLoginLogs() {
    return this.logService.clearLoginLogs();
  }

  @Post('operation/clear')
  @RequirePermission('system:log:delete')
  @OperationLog('日志管理', '清空操作日志')
  @ApiOperation({ summary: '清空操作日志' })
  clearOperationLogs() {
    return this.logService.clearOperationLogs();
  }
}
