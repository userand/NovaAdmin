import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UserEntity, RoleEntity } from '../../entities';
import { RbacService, SUPER_ADMIN_CODE } from '../rbac/rbac.service';
import { QueryUserDto, CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly rbacService: RbacService,
  ) {}

  private get userRepo() {
    return this.dataSource.getRepository(UserEntity);
  }

  private async superRoleIds(): Promise<number[]> {
    const rows: { id: number }[] = await this.dataSource.query(
      `SELECT id FROM sys_role WHERE code = ? AND deleted IS NULL`,
      [SUPER_ADMIN_CODE],
    );
    return rows.map((r) => Number(r.id));
  }

  /**
   * 校验操作人能否管理目标用户：
   * - 本人始终可以
   * - 非超管不能操作超管账号
   * - 其余按操作人的数据范围(目标用户所在部门须在范围内)
   */
  private async assertCanManage(operatorId: number, target: UserEntity) {
    const targetId = Number(target.id);
    if (targetId === Number(operatorId)) return;
    if (await this.rbacService.isSuperAdmin(operatorId)) return;
    if (await this.rbacService.isSuperAdmin(targetId)) throw new ForbiddenException('无权操作超级管理员账号');

    const operator = await this.userRepo.findOne({ where: { id: operatorId } });
    const scope = await this.rbacService.resolveDeptScope(operatorId, operator?.deptId ? Number(operator.deptId) : null);
    if (scope === null) return;
    if (!target.deptId || !scope.includes(Number(target.deptId))) {
      throw new ForbiddenException('无权操作该用户(超出数据权限范围)');
    }
  }

  /** 校验待分配的角色：必须存在；超级管理员角色仅超管可分配 */
  private async assertRolesAssignable(operatorId: number, roleIds: number[]) {
    if (!roleIds.length) return;
    const unique = [...new Set(roleIds.map(Number))];
    const found = await this.dataSource.getRepository(RoleEntity).count({ where: { id: In(unique) } });
    if (found !== unique.length) throw new BadRequestException('包含不存在的角色');
    const superIds = await this.superRoleIds();
    if (unique.some((id) => superIds.includes(id)) && !(await this.rbacService.isSuperAdmin(operatorId))) {
      throw new ForbiddenException('无权分配超级管理员角色');
    }
  }

  /**
   * 分页查询用户列表(含角色/部门信息，应用数据权限)
   * @param operatorId 当前操作人(用于数据范围过滤)
   */
  async findAll(dto: QueryUserDto, operatorId: number) {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.dept', 'd')
      .where('u.deleted IS NULL');

    if (dto.keyword) {
      qb.andWhere('(u.username LIKE :kw OR u.nickname LIKE :kw OR u.phone LIKE :kw)', {
        kw: `%${dto.keyword}%`,
      });
    }
    if (dto.deptId) {
      qb.andWhere('u.dept_id = :deptId', { deptId: dto.deptId });
    }
    if (dto.status) {
      qb.andWhere('u.status = :status', { status: dto.status });
    }
    if (dto.beginDate) {
      qb.andWhere('u.created_at >= :begin', { begin: `${dto.beginDate} 00:00:00` });
    }
    if (dto.endDate) {
      qb.andWhere('u.created_at <= :end', { end: `${dto.endDate} 23:59:59` });
    }

    // ===== 数据权限过滤 =====
    const operator = await this.userRepo.findOne({ where: { id: operatorId } });
    const deptScope = await this.rbacService.resolveDeptScope(operatorId, operator?.deptId ? Number(operator.deptId) : null);
    if (deptScope !== null) {
      if (deptScope.length === 0) {
        // 仅本人
        qb.andWhere('u.id = :operatorId', { operatorId });
      } else {
        qb.andWhere('u.dept_id IN (:...deptScope)', { deptScope });
      }
    }

    const total = await qb.getCount();
    const rows = await qb
      .orderBy('u.id', 'ASC')
      .skip((dto.page - 1) * dto.pageSize)
      .take(dto.pageSize)
      .getMany();

    // 批量查角色
    const userIds = rows.map((u) => Number(u.id));
    const roleMap = new Map<number, { id: number; name: string; code: string }[]>();
    if (userIds.length) {
      const urRows = await this.dataSource.query(
        `SELECT ur.user_id, r.id, r.name, r.code FROM sys_user_role ur
         JOIN sys_role r ON r.id = ur.role_id AND r.deleted IS NULL
         WHERE ur.user_id IN (?)`,
        [userIds],
      );
      urRows.forEach((row: { user_id: number; id: number; name: string; code: string }) => {
        const uid = Number(row.user_id);
        const list = roleMap.get(uid) || [];
        list.push({ id: Number(row.id), name: row.name, code: row.code });
        roleMap.set(uid, list);
      });
    }

    return {
      list: rows.map((u) => ({
        id: Number(u.id),
        username: u.username,
        nickname: u.nickname,
        email: u.email,
        phone: u.phone,
        gender: u.gender,
        avatar: u.avatar,
        signature: u.signature,
        status: u.status,
        deptId: u.deptId ? Number(u.deptId) : null,
        deptName: u.dept?.name || '',
        roles: roleMap.get(Number(u.id)) || [],
        lastLoginAt: u.lastLoginAt,
        loginCount: u.loginCount,
        createdAt: u.createdAt,
      })),
      total,
      page: dto.page,
      pageSize: dto.pageSize,
    };
  }

  async findOne(id: number, operatorId: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    await this.assertCanManage(operatorId, user);
    const urRows = await this.dataSource.query(
      `SELECT role_id FROM sys_user_role WHERE user_id = ?`,
      [id],
    );
    const roleIds = urRows.map((r: { role_id: number }) => Number(r.role_id));
    const roles = roleIds.length
      ? await this.dataSource.getRepository(RoleEntity).find({ where: { id: In(roleIds) } })
      : [];
    return {
      id: Number(user.id),
      username: user.username,
      nickname: user.nickname,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      deptId: user.deptId ? Number(user.deptId) : null,
      status: user.status,
      roleIds: roles.map((r) => Number(r.id)),
      roleNames: roles.map((r) => r.name),
    };
  }

  async create(dto: CreateUserDto, createdBy: string, operatorId: number) {
    const exists = await this.userRepo.findOne({ where: { username: dto.username }, withDeleted: true });
    if (exists) throw new BadRequestException(`账号 ${dto.username} 已存在`);
    await this.assertRolesAssignable(operatorId, dto.roleIds || []);

    // 读取系统初始密码配置
    const configRow = await this.dataSource.query(
      `SELECT value FROM sys_config WHERE \`key\` = 'sys.user.initPassword' AND deleted IS NULL`,
    );
    const initPassword = dto.password || configRow[0]?.value || 'Admin@123';
    const passwordHash = await bcrypt.hash(initPassword, 10);

    const user = await this.dataSource.transaction(async (m) => {
      const repo = m.getRepository(UserEntity);
      const saved = await repo.save(
        repo.create({
          username: dto.username,
          nickname: dto.nickname,
          email: dto.email || '',
          phone: dto.phone || '',
          gender: dto.gender || '0',
          deptId: dto.deptId || null,
          status: dto.status || '0',
          password: passwordHash,
          createdBy,
        }),
      );
      if (dto.roleIds?.length) {
        await m.query(`INSERT INTO sys_user_role (user_id, role_id) VALUES ?`, [
          [...new Set(dto.roleIds)].map((rid) => [Number(saved.id), rid]),
        ]);
      }
      return saved;
    });
    this.rbacService.clearCache(Number(user.id));
    return { id: Number(user.id) };
  }

  async update(id: number, dto: UpdateUserDto, operatorId: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    await this.assertCanManage(operatorId, user);
    if (user.username === 'admin' && dto.status === '1') {
      throw new BadRequestException('不允许停用超级管理员账号');
    }
    if (dto.roleIds) {
      if (Number(id) === Number(operatorId) && !(await this.rbacService.isSuperAdmin(operatorId))) {
        const current: { role_id: number }[] = await this.dataSource.query(
          `SELECT role_id FROM sys_user_role WHERE user_id = ?`,
          [id],
        );
        const before = new Set(current.map((r) => Number(r.role_id)));
        const after = new Set(dto.roleIds.map(Number));
        const changed = before.size !== after.size || [...after].some((rid) => !before.has(rid));
        if (changed) throw new ForbiddenException('不能修改自己的角色');
      }
      await this.assertRolesAssignable(operatorId, dto.roleIds);
      if (Number(id) === 1) {
        const superIds = await this.superRoleIds();
        if (!dto.roleIds.some((rid) => superIds.includes(Number(rid)))) {
          throw new BadRequestException('超级管理员账号必须保留超级管理员角色');
        }
      }
    }

    await this.dataSource.transaction(async (m) => {
      await m.getRepository(UserEntity).update(id, {
        nickname: dto.nickname,
        email: dto.email || '',
        phone: dto.phone || '',
        gender: dto.gender || '0',
        deptId: dto.deptId || null,
        status: dto.status || user.status,
      });
      if (dto.roleIds) {
        await m.query(`DELETE FROM sys_user_role WHERE user_id = ?`, [id]);
        if (dto.roleIds.length) {
          await m.query(`INSERT INTO sys_user_role (user_id, role_id) VALUES ?`, [
            [...new Set(dto.roleIds)].map((rid) => [id, rid]),
          ]);
        }
      }
    });
    this.rbacService.clearCache(id);
    return null;
  }

  async remove(id: number, operatorId: number) {
    if (Number(id) === 1) throw new BadRequestException('不允许删除超级管理员');
    if (Number(id) === operatorId) throw new BadRequestException('不能删除当前登录账号');
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    await this.assertCanManage(operatorId, user);
    await this.dataSource.transaction(async (m) => {
      await m.getRepository(UserEntity).softDelete(id);
      await m.query(`DELETE FROM sys_user_role WHERE user_id = ?`, [id]);
    });
    this.rbacService.clearCache(id);
    return null;
  }

  async resetPassword(id: number, password: string, operatorId: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    await this.assertCanManage(operatorId, user);
    await this.userRepo.update(id, { password: await bcrypt.hash(password, 10) });
    // 密码被他人重置后，目标账号已登录的会话应当失效
    if (Number(id) !== Number(operatorId)) this.rbacService.revokeTokens(id);
    return null;
  }
}
