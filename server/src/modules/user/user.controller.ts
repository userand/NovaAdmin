import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OperationLog } from '../../common/decorators/operation-log.decorator';
import { OperationLogInterceptor } from '../../common/interceptors/operation-log.interceptor';
import { QueryUserDto, CreateUserDto, UpdateUserDto, ResetPasswordDto } from './dto/user.dto';

@ApiTags('用户管理')
@ApiBearerAuth()
@Controller('users')
@UseInterceptors(OperationLogInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @RequirePermission('system:user:list')
  @ApiOperation({ summary: '分页查询用户列表' })
  findAll(@Query() query: QueryUserDto, @CurrentUser('sub') userId: number) {
    return this.userService.findAll(query, Number(userId));
  }

  @Get(':id')
  @RequirePermission('system:user:list')
  @ApiOperation({ summary: '用户详情' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('sub') operatorId: number) {
    return this.userService.findOne(id, Number(operatorId));
  }

  @Post()
  @RequirePermission('system:user:create')
  @OperationLog('用户管理', '新增')
  @ApiOperation({ summary: '新增用户' })
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser('username') username: string,
    @CurrentUser('sub') operatorId: number,
  ) {
    return this.userService.create(dto, username, Number(operatorId));
  }

  @Put(':id')
  @RequirePermission('system:user:update')
  @OperationLog('用户管理', '修改')
  @ApiOperation({ summary: '编辑用户' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser('sub') operatorId: number,
  ) {
    return this.userService.update(id, dto, Number(operatorId));
  }

  @Delete(':id')
  @RequirePermission('system:user:delete')
  @OperationLog('用户管理', '删除')
  @ApiOperation({ summary: '删除用户' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('sub') operatorId: number) {
    return this.userService.remove(id, Number(operatorId));
  }

  @Put(':id/password')
  @RequirePermission('system:user:resetPwd')
  @OperationLog('用户管理', '重置密码')
  @ApiOperation({ summary: '重置用户密码' })
  resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetPasswordDto,
    @CurrentUser('sub') operatorId: number,
  ) {
    return this.userService.resetPassword(id, dto.password, Number(operatorId));
  }
}
