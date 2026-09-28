import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('sys_role')
export class RoleEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 32, comment: '角色名称' })
  name: string;

  @Column({ length: 64, comment: '角色编码' })
  code: string;

  @Column({ name: 'order_num', type: 'int', default: 0 })
  orderNum: number;

  @Column({ name: 'data_scope', length: 1, default: '1', comment: '1全部 3本部门 4本部门及以下 5仅本人' })
  dataScope: string;

  @Column({ length: 255, default: '' })
  remark: string;

  @Column({ length: 1, default: '0' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted' })
  deleted: Date;

  menuIds?: number[];
}
