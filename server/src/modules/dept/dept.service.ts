import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DeptEntity } from '../../entities';
import { buildTree } from '../../common/utils/tree.util';

@Injectable()
export class DeptService {
  constructor(private readonly dataSource: DataSource) {}

  private get deptRepo() {
    return this.dataSource.getRepository(DeptEntity);
  }

  async findTree(keyword?: string, status?: string) {
    const qb = this.deptRepo.createQueryBuilder('d').where('d.deleted IS NULL');
    if (keyword) qb.andWhere('d.name LIKE :kw', { kw: `%${keyword}%` });
    if (status) qb.andWhere('d.status = :status', { status });
    const depts = await qb.orderBy('d.order_num', 'ASC').addOrderBy('d.id', 'ASC').getMany();
    const normalized = depts.map((d) => ({ ...d, id: Number(d.id), parentId: Number(d.parentId) }));
    return buildTree(normalized);
  }

  /** 下拉选项：扁平列表 */
  async findOptions() {
    const depts = await this.deptRepo.find({ where: { status: '0' }, order: { orderNum: 'ASC' } });
    return depts.map((d) => ({ id: Number(d.id), parentId: Number(d.parentId), name: d.name }));
  }

  async create(dto: Partial<DeptEntity>) {
    const parentId = Number(dto.parentId) || 0;
    let ancestors = '0';
    if (parentId) {
      const parent = await this.deptRepo.findOne({ where: { id: parentId } });
      if (!parent) throw new BadRequestException('父部门不存在');
      ancestors = `${parent.ancestors},${parent.id}`;
    }
    const dept = await this.deptRepo.save(this.deptRepo.create({ ...dto, parentId, ancestors }));
    return { id: Number(dept.id) };
  }

  async update(id: number, dto: Partial<DeptEntity>) {
    const dept = await this.deptRepo.findOne({ where: { id } });
    if (!dept) throw new NotFoundException('部门不存在');

    // parentId 未传 = 不调整层级(0 表示移到顶级)
    const changingParent = dto.parentId !== undefined && Number(dto.parentId) !== Number(dept.parentId);
    if (!changingParent) {
      const { parentId: _ignored, ...rest } = dto;
      await this.deptRepo.update(id, rest);
      return null;
    }

    const newParentId = Number(dto.parentId) || 0;
    if (newParentId === Number(id)) throw new BadRequestException('上级部门不能选择自己');

    let newAncestors = '0';
    if (newParentId) {
      const newParent = await this.deptRepo.findOne({ where: { id: newParentId } });
      if (!newParent) throw new BadRequestException('父部门不存在');
      // 防环：新上级不能是自己的后代
      if (`,${newParent.ancestors},`.includes(`,${id},`)) {
        throw new BadRequestException('上级部门不能选择自己的下级部门');
      }
      newAncestors = `${newParent.ancestors},${newParent.id}`;
    }

    // 后代的 ancestors 以 "<旧祖级>,<本部门id>" 为前缀，整体替换为新前缀(前缀匹配而非 REPLACE，避免误伤中间片段)
    const oldPrefix = `${dept.ancestors},${id}`;
    const newPrefix = `${newAncestors},${id}`;
    await this.dataSource.transaction(async (m) => {
      await m.query(
        `UPDATE sys_dept SET ancestors = CONCAT(?, SUBSTRING(ancestors, ?))
         WHERE ancestors = ? OR ancestors LIKE ?`,
        [newPrefix, oldPrefix.length + 1, oldPrefix, `${oldPrefix},%`],
      );
      await m.getRepository(DeptEntity).update(id, { ...dto, parentId: newParentId, ancestors: newAncestors });
    });
    return null;
  }

  async remove(id: number) {
    const dept = await this.deptRepo.findOne({ where: { id } });
    if (!dept) throw new NotFoundException('部门不存在');
    const childCount = await this.deptRepo.count({ where: { parentId: id } });
    if (childCount > 0) throw new BadRequestException('存在子部门，请先删除子部门');
    const userCount: { cnt: number }[] = await this.deptRepo.query(
      `SELECT COUNT(*) as cnt FROM sys_user WHERE dept_id = ? AND deleted IS NULL`,
      [id],
    );
    if (Number(userCount[0]?.cnt) > 0) throw new BadRequestException('部门下存在用户，请先转移用户');
    await this.deptRepo.softDelete(id);
    return null;
  }
}
