import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Not } from 'typeorm';
import { ConfigEntity, NoticeEntity } from '../../entities';
import { normalizePage } from '../../common/utils/pagination.util';

@Injectable()
export class ConfigService {
  constructor(private readonly dataSource: DataSource) {}

  private get configRepo() {
    return this.dataSource.getRepository(ConfigEntity);
  }

  async findAll(keyword?: string, pageParam: unknown = 1, pageSizeParam: unknown = 10) {
    const { page, pageSize } = normalizePage(pageParam, pageSizeParam);
    const qb = this.configRepo.createQueryBuilder('c').where('c.deleted IS NULL');
    if (keyword) {
      qb.andWhere('(c.name LIKE :kw OR c.key LIKE :kw)', { kw: `%${keyword}%` });
    }
    const total = await qb.getCount();
    const list = await qb
      .orderBy('c.id', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();
    return {
      list: list.map((c) => ({
        id: Number(c.id), name: c.name, key: c.key, value: c.value,
        isBuiltin: !!c.isBuiltin, remark: c.remark, createdAt: c.createdAt,
      })),
      total, page, pageSize,
    };
  }

  async create(dto: Partial<ConfigEntity>) {
    // withDeleted：key 有唯一索引，已软删的同名记录同样会冲突
    const exists = await this.configRepo.findOne({ where: { key: dto.key }, withDeleted: true });
    if (exists) throw new BadRequestException(`参数键名 ${dto.key} 已存在`);
    const saved = await this.configRepo.save(this.configRepo.create(dto));
    return { id: Number(saved.id) };
  }

  async update(id: number, dto: Partial<ConfigEntity>) {
    const config = await this.configRepo.findOne({ where: { id } });
    if (!config) throw new NotFoundException('参数不存在');
    if (dto.key && dto.key !== config.key) {
      if (config.isBuiltin) throw new BadRequestException('内置参数不允许修改键名');
      const dup = await this.configRepo.findOne({ where: { key: dto.key, id: Not(id) }, withDeleted: true });
      if (dup) throw new BadRequestException(`参数键名 ${dto.key} 已存在`);
    }
    await this.configRepo.update(id, dto);
    return null;
  }

  async remove(id: number) {
    const config = await this.configRepo.findOne({ where: { id } });
    if (!config) throw new NotFoundException('参数不存在');
    if (config.isBuiltin) throw new BadRequestException('内置参数不允许删除');
    await this.configRepo.softDelete(id);
    return null;
  }

  async refreshCache() {
    return null; // 预留：生产可联动缓存刷新
  }
}

@Injectable()
export class NoticeService {
  constructor(private readonly dataSource: DataSource) {}

  private get noticeRepo() {
    return this.dataSource.getRepository(NoticeEntity);
  }

  async findAll(keyword?: string, type?: string, pageParam: unknown = 1, pageSizeParam: unknown = 10) {
    const { page, pageSize } = normalizePage(pageParam, pageSizeParam);
    const qb = this.noticeRepo.createQueryBuilder('n').where('n.deleted IS NULL');
    if (keyword) qb.andWhere('n.title LIKE :kw', { kw: `%${keyword}%` });
    if (type) qb.andWhere('n.type = :type', { type });
    const total = await qb.getCount();
    const list = await qb
      .orderBy('n.top', 'DESC')
      .addOrderBy('n.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();
    return {
      list: list.map((n) => ({
        id: Number(n.id), title: n.title, type: n.type, content: n.content,
        status: n.status, top: !!n.top, createdBy: n.createdBy, createdAt: n.createdAt,
      })),
      total, page, pageSize,
    };
  }

  async latest(limitParam: unknown = 5) {
    const n = Math.floor(Number(limitParam));
    const limit = Number.isFinite(n) && n >= 1 ? Math.min(n, 20) : 5;
    const list = await this.noticeRepo.find({
      where: { status: '0' },
      order: { top: 'DESC', createdAt: 'DESC' },
      take: limit,
    });
    return list.map((n) => ({ id: Number(n.id), title: n.title, type: n.type, top: !!n.top, createdAt: n.createdAt }));
  }

  async create(dto: Partial<NoticeEntity>, createdBy: string) {
    const saved = await this.noticeRepo.save(this.noticeRepo.create({ ...dto, createdBy }));
    return { id: Number(saved.id) };
  }

  async update(id: number, dto: Partial<NoticeEntity>) {
    const notice = await this.noticeRepo.findOne({ where: { id } });
    if (!notice) throw new NotFoundException('通知不存在');
    await this.noticeRepo.update(id, dto);
    return null;
  }

  async remove(id: number) {
    const notice = await this.noticeRepo.findOne({ where: { id } });
    if (!notice) throw new NotFoundException('通知不存在');
    await this.noticeRepo.softDelete(id);
    return null;
  }
}
