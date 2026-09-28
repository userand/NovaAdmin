import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('sys_dept')
export class DeptEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'parent_id', type: 'bigint', default: 0 })
  parentId: number;

  @Column({ length: 255, default: '' })
  ancestors: string;

  @Column({ length: 64, comment: '部门名称' })
  name: string;

  @Column({ name: 'order_num', type: 'int', default: 0 })
  orderNum: number;

  @Column({ length: 32, default: '' })
  leader: string;

  @Column({ length: 18, default: '' })
  phone: string;

  @Column({ length: 64, default: '' })
  email: string;

  @Column({ length: 1, default: '0' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted' })
  deleted: Date;

  children?: DeptEntity[];
}
