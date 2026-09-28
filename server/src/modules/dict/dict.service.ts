import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Not } from 'typeorm';
import { normalizePage } from '../../common/utils/pagination.util';
import { DictTypeEntity, DictDataEntity } from '../../entities';

@Injectable()
export class DictService {
  constructor(private readonly dataSource: DataSource) {}

  private get typeRepo() {
    return this.dataSource.getRepository(DictTypeEntity);
  }
  private get dataRepo() {
    return this.dataSource.getRepository(DictDataEntity);
  }

  // ===== 字典类型 =====
  async findTypes(keyword?: string, pageParam: unknown = 1, pageSizeParam: unknown = 10) {
    const { page, pageSize } = normalizePage(pageParam, pageSizeParam);
    const qb = this.typeRepo.createQueryBuilder('t').where('t.deleted IS NULL');
    if (keyword) qb.andWhere('(t.name LIKE :kw OR t.code LIKE :kw)', { kw: `%${keyword}%` });
    const total = await qb.getCount();
    const list = await qb
      .orderBy('t.id', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();
    // 每类型字典项数量
    const counts: { type_code: string; cnt: number }[] = await this.dataSource.query(
      `SELECT type_code, COUNT(*) as cnt FROM sys_dict_data WHERE deleted IS NULL GROUP BY type_code`,
    );
    const countMap = new Map(counts.map((c) => [c.type_code, Number(c.cnt)]));
    return {
      list: list.map((t) => ({
        id: Number(t.id), name: t.name, code: t.code, status: t.status,
        remark: t.remark, createdAt: t.createdAt, dataCount: countMap.get(t.code) || 0,
      })),
      total, page, pageSize,
    };
  }

  async createType(dto: Partial<DictTypeEntity>) {
    // withDeleted：code 有唯一索引，已软删的同编码记录同样会冲突
    const exists = await this.typeRepo.findOne({ where: { code: dto.code }, withDeleted: true });
    if (exists) throw new BadRequestException(`字典编码 ${dto.code} 已存在`);
    const saved = await this.typeRepo.save(this.typeRepo.create(dto));
    return { id: Number(saved.id) };
  }

  async updateType(id: number, dto: Partial<DictTypeEntity>) {
    const type = await this.typeRepo.findOne({ where: { id } });
    if (!type) throw new NotFoundException('字典类型不存在');
    // 编码变更时同步字典数据的 type_code
    if (dto.code && dto.code !== type.code) {
      const dup = await this.typeRepo.findOne({ where: { code: dto.code, id: Not(id) }, withDeleted: true });
      if (dup) throw new BadRequestException(`字典编码 ${dto.code} 已存在`);
      await this.dataRepo.update({ typeCode: type.code }, { typeCode: dto.code });
    }
    await this.typeRepo.update(id, dto);
    return null;
  }

  async removeType(id: number) {
    const type = await this.typeRepo.findOne({ where: { id } });
    if (!type) throw new NotFoundException('字典类型不存在');
    const count = await this.dataRepo.count({ where: { typeCode: type.code } });
    if (count > 0) throw new BadRequestException('该类型下存在字典数据，请先清空');
    await this.typeRepo.softDelete(id);
    return null;
  }

  // ===== 字典数据 =====
  async findDatas(typeCode: string, keyword?: string) {
    if (!typeCode) throw new BadRequestException('缺少字典类型编码 typeCode');
    const qb = this.dataRepo.createQueryBuilder('d')
      .where('d.deleted IS NULL AND d.typeCode = :typeCode', { typeCode });
    if (keyword) qb.andWhere('(d.label LIKE :kw OR d.value LIKE :kw)', { kw: `%${keyword}%` });
    const list = await qb.orderBy('d.order_num', 'ASC').addOrderBy('d.id', 'ASC').getMany();
    return list.map((d) => ({
      id: Number(d.id), typeCode: d.typeCode, label: d.label, value: d.value,
      tagType: d.tagType, orderNum: d.orderNum, status: d.status, remark: d.remark, createdAt: d.createdAt,
    }));
  }

  /** 按编码批量返回字典(前端下拉/标签用) */
  async getDictMap(codes: string[]) {
    const list = await this.dataRepo.find({ where: { status: '0' }, order: { orderNum: 'ASC' } });
    const map: Record<string, { label: string; value: string; tagType: string }[]> = {};
    codes.forEach((c) => (map[c] = []));
    list.forEach((d) => {
      if (map[d.typeCode]) map[d.typeCode].push({ label: d.label, value: d.value, tagType: d.tagType });
    });
    return map;
  }

  async createData(dto: Partial<DictDataEntity>) {
    const type = await this.typeRepo.findOne({ where: { code: dto.typeCode } });
    if (!type) throw new BadRequestException('字典类型不存在');
    const saved = await this.dataRepo.save(this.dataRepo.create(dto));
    return { id: Number(saved.id) };
  }

  async updateData(id: number, dto: Partial<DictDataEntity>) {
    const data = await this.dataRepo.findOne({ where: { id } });
    if (!data) throw new NotFoundException('字典数据不存在');
    await this.dataRepo.update(id, dto);
    return null;
  }

  async removeData(id: number) {
    const data = await this.dataRepo.findOne({ where: { id } });
    if (!data) throw new NotFoundException('字典数据不存在');
    await this.dataRepo.softDelete(id);
    return null;
  }
}
