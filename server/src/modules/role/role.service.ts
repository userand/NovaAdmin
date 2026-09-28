import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Not } from 'typeorm';
import { RoleEntity } from '../../entities';
import { RbacService, SUPER_ADMIN_CODE } from '../rbac/rbac.service';
import { buildTree } from '../../common/utils/tree.util';
import { normalizePage } from '../../common/utils/pagination.util';

@Injectable()
export class RoleService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly rbacService: RbacService,
  ) {}

  private get roleRepo() {
    return this.dataSource.getRepository(RoleEntity);
  }

  async findAll(keyword?: string, status?: string, pageParam: unknown = 1, pageSizeParam: unknown = 10) {
    const { page, pageSize } = normalizePage(pageParam, pageSizeParam);
    const qb = this.roleRepo.createQueryBuilder('r').where('r.deleted IS NULL');
    if (keyword) {
      qb.andWhere('(r.name LIKE :kw OR r.code LIKE :kw)', { kw: `%${keyword}%` });
    }
    if (status) qb.andWhere('r.status = :status', { status });

    const total = await qb.getCount();
    const list = await qb
      .orderBy('r.order_num', 'ASC')
      .addOrderBy('r.id', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    // 每个角色的用户数
    const counts: { role_id: number; cnt: number }[] = await this.dataSource.query(
      `SELECT role_id, COUNT(*) as cnt FROM sys_user_role GROUP BY role_id`,
    );
    const countMap = new Map(counts.map((c) => [Number(c.role_id), Number(c.cnt)]));

    // 每个角色已分配的菜单ID(一次查询)
    const menuIdsMap = new Map<number, number[]>();
    if (list.length) {
      const rmRows: { role_id: number; menu_id: number }[] = await this.dataSource.query(
        `SELECT role_id, menu_id FROM sys_role_menu WHERE role_id IN (?)`,
        [list.map((r) => Number(r.id))],
      );
      rmRows.forEach((row) => {
        const rid = Number(row.role_id);
        menuIdsMap.set(rid, [...(menuIdsMap.get(rid) || []), Number(row.menu_id)]);
      });
    }

    return {
      list: list.map((r) => ({
        id: Number(r.id),
        name: r.name,
        code: r.code,
        orderNum: r.orderNum,
        dataScope: r.dataScope,
        remark: r.remark,
        status: r.status,
        createdAt: r.createdAt,
        userCount: countMap.get(Number(r.id)) || 0,
        menuIds: menuIdsMap.get(Number(r.id)) || [],
      })),
      total,
      page,
      pageSize,
    };
  }

  async findAllSimple() {
    const list = await this.roleRepo.find({ where: { status: '0' }, order: { orderNum: 'ASC' } });
    return list.map((r) => ({ id: Number(r.id), name: r.name, code: r.code }));
  }

  async findOne(id: number) {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException('角色不存在');
    const rmRows: { menu_id: number }[] = await this.dataSource.query(
      `SELECT menu_id FROM sys_role_menu WHERE role_id = ?`,
      [id],
    );
    return {
      id: Number(role.id),
      name: role.name,
      code: role.code,
      orderNum: role.orderNum,
      dataScope: role.dataScope,
      remark: role.remark,
      status: role.status,
      menuIds: rmRows.map((r) => Number(r.menu_id)),
    };
  }

  async create(dto: Partial<RoleEntity> & { menuIds?: number[] }) {
    if (dto.code === SUPER_ADMIN_CODE) throw new BadRequestException(`角色编码 ${SUPER_ADMIN_CODE} 为系统保留`);
    // withDeleted：数据库对 code 有唯一索引，已软删的同编码记录同样会冲突
    const exists = await this.roleRepo.findOne({ where: { code: dto.code }, withDeleted: true });
    if (exists) throw new BadRequestException(`角色编码 ${dto.code} 已存在`);

    const role = await this.dataSource.transaction(async (m) => {
      const repo = m.getRepository(RoleEntity);
      const saved = await repo.save(
        repo.create({
          name: dto.name,
          code: dto.code,
          orderNum: dto.orderNum ?? 0,
          dataScope: dto.dataScope ?? '1',
          remark: dto.remark || '',
          status: dto.status || '0',
        }),
      );
      if (dto.menuIds?.length) {
        await m.query(`INSERT INTO sys_role_menu (role_id, menu_id) VALUES ?`, [
          [...new Set(dto.menuIds)].map((mid) => [Number(saved.id), mid]),
        ]);
      }
      return saved;
    });
    this.rbacService.clearCache();
    return { id: Number(role.id) };
  }

  async update(id: number, dto: Partial<RoleEntity> & { menuIds?: number[] }) {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException('角色不存在');
    const isSuperRole = role.code === SUPER_ADMIN_CODE;

    if (dto.code && dto.code !== role.code) {
      if (isSuperRole) throw new BadRequestException('不允许修改超级管理员角色编码');
      // 反向同样要拦：否则任何有角色编辑权限的人都能把自己的角色改名为 super_admin 提权
      if (dto.code === SUPER_ADMIN_CODE) throw new BadRequestException(`角色编码 ${SUPER_ADMIN_CODE} 为系统保留`);
      const dup = await this.roleRepo.findOne({ where: { code: dto.code, id: Not(id) }, withDeleted: true });
      if (dup) throw new BadRequestException(`角色编码 ${dto.code} 已存在`);
    }
    if (isSuperRole && dto.status === '1') throw new BadRequestException('不允许停用超级管理员角色');

    await this.dataSource.transaction(async (m) => {
      await m.getRepository(RoleEntity).update(id, {
        name: dto.name ?? role.name,
        code: dto.code ?? role.code,
        orderNum: dto.orderNum ?? role.orderNum,
        dataScope: dto.dataScope ?? role.dataScope,
        remark: dto.remark ?? role.remark,
        status: dto.status ?? role.status,
      });
      if (dto.menuIds) {
        await m.query(`DELETE FROM sys_role_menu WHERE role_id = ?`, [id]);
        if (dto.menuIds.length) {
          await m.query(`INSERT INTO sys_role_menu (role_id, menu_id) VALUES ?`, [
            [...new Set(dto.menuIds)].map((mid) => [id, mid]),
          ]);
        }
      }
    });
    this.rbacService.clearCache();
    return null;
  }

  async remove(id: number) {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException('角色不存在');
    if (Number(id) === 1 || role.code === SUPER_ADMIN_CODE) throw new BadRequestException('不允许删除超级管理员角色');
    const userCount: { cnt: number }[] = await this.dataSource.query(
      `SELECT COUNT(*) as cnt FROM sys_user_role WHERE role_id = ?`,
      [id],
    );
    if (Number(userCount[0]?.cnt) > 0) {
      throw new BadRequestException('该角色已分配用户，请先解除分配');
    }
    await this.dataSource.transaction(async (m) => {
      await m.getRepository(RoleEntity).softDelete(id);
      await m.query(`DELETE FROM sys_role_menu WHERE role_id = ?`, [id]);
    });
    this.rbacService.clearCache();
    return null;
  }

  /** 菜单树(勾选权限用)：全量菜单 + 树形结构 */
  async getMenuTree() {
    const menus = await this.dataSource.query(
      `SELECT id, parent_id, name, type, order_num FROM sys_menu WHERE deleted IS NULL AND status = '0' ORDER BY order_num ASC`,
    );
    return buildTree(
      menus.map((m: { id: number; parent_id: number; name: string; type: string }) => ({
        id: Number(m.id),
        parentId: Number(m.parent_id),
        name: m.name,
        type: m.type,
      })),
    );
  }
}
