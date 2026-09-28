import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/decorators/permission.decorator';
import { OperationLog } from '../../../common/decorators/operation-log.decorator';
import { OperationLogInterceptor } from '../../../common/interceptors/operation-log.interceptor';
import { MemberService } from '../services/member.service';
import {
  CreateMemberDto, MemberResetPasswordDto, QueryMemberDto, QueryMemberLogDto, UpdateMemberDto, UpdateSettingsDto,
} from '../dto/member.dto';

/** 后台 · 会员中心(需后台令牌 + 权限点) */
@ApiTags('会员中心')
@ApiBearerAuth()
@Controller('members')
@UseInterceptors(OperationLogInterceptor)
export class MemberController {
  constructor(private readonly members: MemberService) {}

  // 固定路径必须写在 :id 之前
  @Get('stats')
  @RequirePermission('member:list')
  @ApiOperation({ summary: '会员统计：总数 / 今日新增 / 7 日活跃 / 停用 / 微信绑定' })
  stats() {
    return this.members.stats();
  }

  @Get('settings')
  @RequirePermission('member:setting:list')
  @ApiOperation({ summary: '登录方式开关 + 各通道(短信/邮件/微信)接入状态' })
  getSettings() {
    return this.members.getSettings();
  }

  @Put('settings')
  @RequirePermission('member:setting:update')
  @OperationLog('会员中心', '登录方式设置')
  @ApiOperation({ summary: '修改登录方式开关' })
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.members.updateSettings(dto);
  }

  @Get('logs')
  @RequirePermission('member:log:list')
  @ApiOperation({ summary: '会员登录日志' })
  logs(@Query() query: QueryMemberLogDto) {
    return this.members.findLogs(query);
  }

  @Get()
  @RequirePermission('member:list')
  @ApiOperation({ summary: '会员分页列表' })
  findAll(@Query() query: QueryMemberDto) {
    return this.members.findAll(query);
  }

  @Get(':id')
  @RequirePermission('member:list')
  @ApiOperation({ summary: '会员详情(含第三方绑定与最近登录)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.members.findOne(id);
  }

  @Post()
  @RequirePermission('member:create')
  @OperationLog('会员中心', '新增会员')
  @ApiOperation({ summary: '后台新增会员' })
  create(@Body() dto: CreateMemberDto) {
    return this.members.create(dto);
  }

  @Put(':id')
  @RequirePermission('member:update')
  @OperationLog('会员中心', '编辑会员')
  @ApiOperation({ summary: '编辑会员(停用会立即让其登录失效)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMemberDto) {
    return this.members.update(id, dto);
  }

  @Put(':id/password')
  @RequirePermission('member:resetPwd')
  @OperationLog('会员中心', '重置会员密码')
  @ApiOperation({ summary: '重置会员密码(该会员所有设备登录失效)' })
  resetPassword(@Param('id', ParseIntPipe) id: number, @Body() dto: MemberResetPasswordDto) {
    return this.members.resetPassword(id, dto.password);
  }

  @Post(':id/kick')
  @RequirePermission('member:update')
  @OperationLog('会员中心', '强制下线')
  @ApiOperation({ summary: '强制下线：该会员所有设备登录立即失效' })
  kick(@Param('id', ParseIntPipe) id: number) {
    return this.members.kick(id);
  }

  @Delete(':id/identities/:identityId')
  @RequirePermission('member:update')
  @OperationLog('会员中心', '解绑第三方账号')
  @ApiOperation({ summary: '解绑会员的微信等第三方身份' })
  unbind(@Param('id', ParseIntPipe) id: number, @Param('identityId', ParseIntPipe) identityId: number) {
    return this.members.unbindIdentity(id, identityId);
  }

  @Delete(':id')
  @RequirePermission('member:delete')
  @OperationLog('会员中心', '删除会员')
  @ApiOperation({ summary: '删除(注销)会员，释放其手机号/邮箱/微信绑定' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.members.remove(id);
  }
}
