import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MenuEntity } from '../../entities';
import { RbacService } from '../rbac/rbac.service';
import { buildTree } from '../../common/utils/tree.util';

@Injectable()
export class MenuService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly rbacService: RbacService,
  ) {}

  private get menuRepo() {
    return this.dataSource.getRepository(MenuEntity);
  }

  async findTree(keyword?: string) {
    const qb = this.menuRepo.createQueryBuilder('m').where('m.deleted IS NULL');
    if (keyword) qb.andWhere('m.name LIKE :kw', { kw: `%${keyword}%` });
    const menus = await qb.orderBy('m.order_num', 'ASC').addOrderBy('m.id', 'ASC').getMany();
    const normalized = menus.map((m) => ({ ...m, id: Number(m.id), parentId: Number(m.parentId) }));
    return buildTree(normalized);
  }

  async findOne(id: number) {
    const menu = await this.menuRepo.findOne({ where: { id } });
    if (!menu) throw new NotFoundException('菜单不存在');
    return { ...menu, id: Number(menu.id), parentId: Number(menu.parentId) };
  }

  async create(dto: Partial<MenuEntity>) {
    if (dto.parentId) {
      const parent = await this.menuRepo.findOne({ where: { id: dto.parentId } });
      if (!parent) throw new BadRequestException('父级菜单不存在');
    }
    const menu = await this.menuRepo.save(this.menuRepo.create(dto));
    this.rbacService.clearCache();
    return { id: Number(menu.id) };
  }

  async update(id: number, dto: Partial<MenuEntity>) {
    const menu = await this.menuRepo.findOne({ where: { id } });
    if (!menu) throw new NotFoundException('菜单不存在');
    if (dto.parentId !== undefined && Number(dto.parentId) !== Number(menu.parentId)) {
      const newParentId = Number(dto.parentId) || 0;
      if (newParentId === Number(id)) throw new BadRequestException('上级菜单不能选择自己');
      if (newParentId) {
        // 沿新上级向上回溯，若遇到自己说明选了自己的下级(成环)
        let cursor: MenuEntity | null = await this.menuRepo.findOne({ where: { id: newParentId } });
        if (!cursor) throw new BadRequestException('父级菜单不存在');
        const seen = new Set<number>();
        while (cursor && !seen.has(Number(cursor.id))) {
          if (Number(cursor.id) === Number(id)) throw new BadRequestException('上级菜单不能选择自己的下级菜单');
          seen.add(Number(cursor.id));
          cursor = Number(cursor.parentId)
            ? await this.menuRepo.findOne({ where: { id: Number(cursor.parentId) } })
            : null;
        }
      }
    }
    await this.menuRepo.update(id, dto);
    this.rbacService.clearCache();
    return null;
  }

  async remove(id: number) {
    const childCount = await this.menuRepo.count({ where: { parentId: id } });
    if (childCount > 0) throw new BadRequestException('存在子菜单，请先删除子菜单');
    const usedCount: { cnt: number }[] = await this.dataSource.query(
      `SELECT COUNT(*) as cnt FROM sys_role_menu WHERE menu_id = ?`,
      [id],
    );
    if (Number(usedCount[0]?.cnt) > 0) {
      throw new BadRequestException('该菜单已分配给角色，请先取消分配');
    }
    await this.menuRepo.softDelete(id);
    this.rbacService.clearCache();
    return null;
  }
}
