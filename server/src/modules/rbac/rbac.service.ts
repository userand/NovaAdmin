import { Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { MenuEntity, RoleEntity } from '../../entities';

interface PermissionCacheEntry {
  isSuperAdmin: boolean;
  permissions: Set<string>;
  expireAt: number;
}

export const SUPER_ADMIN_CODE = 'super_admin';
const CACHE_TTL_MS = 60 * 1000;

/**
 * RBAC 核心服务：
 * - 用户角色 / 权限集合查询(带短 TTL 内存缓存)
 * - 用户可见菜单树
 * - 数据权限范围解析
 */
@Injectable()
export class RbacService {
  private readonly permissionCache = new Map<number, PermissionCacheEntry>();
  /** 用户状态缓存(短 TTL)：令牌校验时确认账号仍存在且未停用 */
  private readonly activeCache = new Map<number, { active: boolean; expireAt: number }>();
  /** 退出登录时间(秒)：签发时间早于它的令牌一律失效(内存态，进程重启后清空) */
  private readonly revokedBefore = new Map<number, number>();

  constructor(private readonly dataSource: DataSource) {}

  private get userRoleRepo() {
    return this.dataSource.getRepository('sys_user_role');
  }

  private get roleRepo() {
    return this.dataSource.getRepository(RoleEntity);
  }

  private get menuRepo() {
    return this.dataSource.getRepository(MenuEntity);
  }

  /** 获取用户角色实体列表 */
  async getUserRoles(userId: number): Promise<RoleEntity[]> {
    const rows = (await this.userRoleRepo.find({ where: { userId } })) as unknown as {
      userId: number;
      roleId: number;
    }[];
    if (!rows.length) return [];
    const roleIds = rows.map((r) => Number(r.roleId));
    return this.roleRepo.find({ where: { id: In(roleIds), status: '0' } });
  }

  /** 是否超级管理员 */
  async isSuperAdmin(userId: number): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return roles.some((r) => r.code === SUPER_ADMIN_CODE);
  }

  /**
   * 用户权限标识集合(缓存 60s)
   * 超级管理员返回 { isSuperAdmin: true, permissions: Set('*') }
   */
  async getUserPermissionSet(userId: number): Promise<PermissionCacheEntry> {
    const cached = this.permissionCache.get(Number(userId));
    if (cached && cached.expireAt > Date.now()) return cached;

    const roles = await this.getUserRoles(userId);
    const isSuperAdmin = roles.some((r) => r.code === SUPER_ADMIN_CODE);
    let permissions = new Set<string>();

    if (isSuperAdmin) {
      permissions = new Set(['*']);
    } else if (roles.length) {
      const roleIds = roles.map((r) => Number(r.id));
      const rmRows = (await this.dataSource.getRepository('sys_role_menu').find({
        where: { roleId: In(roleIds) },
      })) as unknown as { roleId: number; menuId: number }[];
      const menuIds = rmRows.map((r) => Number(r.menuId));
      if (menuIds.length) {
        const menus = await this.menuRepo.find({
          where: { id: In(menuIds), status: '0' },
          select: ['perms'],
        });
        menus.forEach((m) => {
          if (m.perms) m.perms.split(',').forEach((p) => p.trim() && permissions.add(p.trim()));
        });
      }
    }

    const entry: PermissionCacheEntry = { isSuperAdmin, permissions, expireAt: Date.now() + CACHE_TTL_MS };
    this.permissionCache.set(Number(userId), entry);
    return entry;
  }

  /** 用户可见的菜单列表(含目录/菜单/按钮) */
  async getUserMenus(userId: number): Promise<MenuEntity[]> {
    const qb = this.menuRepo
      .createQueryBuilder('m')
      .where('m.status = :status', { status: '0' })
      .orderBy('m.order_num', 'ASC');

    if (!(await this.isSuperAdmin(userId))) {
      const roles = await this.getUserRoles(userId);
      const roleIds = roles.map((r) => Number(r.id));
      if (!roleIds.length) return [];
      qb.andWhere(
        `m.id IN (SELECT rm.menu_id FROM sys_role_menu rm WHERE rm.role_id IN (:...roleIds))`,
        { roleIds },
      );
    }
    return qb.getMany();
  }

  /**
   * 解析数据权限：返回可访问的部门 ID 集合
   * - '1' 全部 → null (不限制)
   * - '3' 本部门
   * - '4' 本部门及以下
   * - '5' 仅本人 → 空数组(由调用方转为本部门-0处理)
   */
  async resolveDeptScope(userId: number, userDeptId: number | null): Promise<number[] | null> {
    const roles = await this.getUserRoles(userId);
    if (roles.some((r) => r.code === SUPER_ADMIN_CODE || r.dataScope === '1')) return null;

    // 多角色取最大范围: 4 > 3 > 5
    const scopes = new Set(roles.map((r) => r.dataScope));
    if (scopes.has('4')) {
      return this.getChildDeptIds(userDeptId, true);
    }
    if (scopes.has('3')) return userDeptId ? [userDeptId] : [];
    return []; // 仅本人
  }

  /** 递归获取子部门 ID(含自身) */
  async getChildDeptIds(deptId: number | null, includeSelf = true): Promise<number[]> {
    if (!deptId) return [];
    const dept = await this.dataSource.query(
      `SELECT ancestors FROM sys_dept WHERE id = ? AND deleted IS NULL`,
      [deptId],
    );
    if (!dept.length) return includeSelf ? [deptId] : [];
    const prefix = `${dept[0].ancestors},${deptId}`;
    const children = await this.dataSource.query(
      `SELECT id FROM sys_dept WHERE (ancestors = ? OR ancestors LIKE ?) AND deleted IS NULL`,
      [prefix, `${prefix},%`],
    );
    const ids = children.map((c: { id: number | string }) => Number(c.id));
    return includeSelf ? [deptId, ...ids] : ids;
  }

  /** 账号是否仍可用(存在且未停用)，带 60s 缓存；用户变更/删除时由 clearCache 主动失效 */
  async isUserActive(userId: number): Promise<boolean> {
    const uid = Number(userId);
    const cached = this.activeCache.get(uid);
    if (cached && cached.expireAt > Date.now()) return cached.active;
    const rows: { status: string }[] = await this.dataSource.query(
      `SELECT status FROM sys_user WHERE id = ? AND deleted IS NULL`,
      [uid],
    );
    const active = rows[0]?.status === '0';
    this.activeCache.set(uid, { active, expireAt: Date.now() + CACHE_TTL_MS });
    return active;
  }

  /** 吊销该用户此刻之前签发的所有令牌(退出登录) */
  revokeTokens(userId: number) {
    this.revokedBefore.set(Number(userId), Math.floor(Date.now() / 1000));
  }

  /**
   * 令牌(签发时间 iat，秒)是否已被吊销。
   * iat 只有秒级精度，用 <= 以保证与退出登录同一秒内签发的令牌也一并失效(宁可误杀同秒重新登录，也不漏放)。
   */
  isTokenRevoked(userId: number, iat?: number): boolean {
    const t = this.revokedBefore.get(Number(userId));
    return t !== undefined && (iat ?? 0) <= t;
  }

  /** 清除权限缓存(用户/角色/菜单变更后调用) */
  clearCache(userId?: number) {
    if (userId) {
      this.permissionCache.delete(Number(userId));
      this.activeCache.delete(Number(userId));
    } else {
      this.permissionCache.clear();
      this.activeCache.clear();
    }
  }
}
