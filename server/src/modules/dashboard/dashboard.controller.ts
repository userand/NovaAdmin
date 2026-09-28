import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { RbacService } from '../rbac/rbac.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('仪表盘')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly rbacService: RbacService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: '核心指标卡' })
  stats() {
    return this.dashboardService.getStats();
  }

  @Get('login-trend')
  @ApiOperation({ summary: '近14天登录趋势' })
  loginTrend() {
    return this.dashboardService.getLoginTrend();
  }

  @Get('dept-distribution')
  @ApiOperation({ summary: '部门人数分布' })
  deptDistribution() {
    return this.dashboardService.getDeptDistribution();
  }

  @Get('gender-ratio')
  @ApiOperation({ summary: '性别占比' })
  genderRatio() {
    return this.dashboardService.getGenderRatio();
  }

  @Get('operation-distribution')
  @ApiOperation({ summary: '操作模块分布' })
  operationDistribution() {
    return this.dashboardService.getOperationDistribution();
  }

  @Get('recent-logins')
  @ApiOperation({ summary: '最新登录记录' })
  async recentLogins(@CurrentUser('sub') userId: number) {
    const { isSuperAdmin, permissions } = await this.rbacService.getUserPermissionSet(Number(userId));
    const canViewLog = isSuperAdmin || permissions.has('system:log:list');
    return this.dashboardService.getRecentLogins(8, !canViewLog);
  }
}
