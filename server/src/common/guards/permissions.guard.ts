import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/permission.decorator';
import type { AuthRequest } from '../decorators/current-user.decorator';
import { RbacService } from '../../modules/rbac/rbac.service';

/**
 * 全局接口权限守卫：校验 @RequirePermission('system:user:create') 声明的权限
 * super_admin 角色直接放行，其余按用户拥有的按钮/菜单权限集合判断
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPerms = this.reflector.getAllAndOverride<string[]>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPerms || requiredPerms.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthRequest>();
    const userId = Number(request.user?.sub);
    const { isSuperAdmin, permissions } = await this.rbacService.getUserPermissionSet(userId);
    if (isSuperAdmin) return true;

    const has = requiredPerms.every((perm) => permissions.has(perm));
    if (!has) throw new ForbiddenException(`没有操作权限：${requiredPerms.join(' / ')}`);
    return true;
  }
}
