import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('sys_menu')
export class MenuEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'parent_id', type: 'bigint', default: 0 })
  parentId: number;

  @Column({ length: 64, comment: '菜单名称' })
  name: string;

  @Column({ length: 1, comment: 'M目录 C菜单 F按钮' })
  type: string;

  @Column({ length: 255, default: '' })
  path: string;

  @Column({ length: 255, default: '' })
  component: string;

  @Column({ length: 128, default: '' })
  perms: string;

  @Column({ length: 64, default: '' })
  icon: string;

  @Column({ name: 'order_num', type: 'int', default: 0 })
  orderNum: number;

  @Column({ type: 'tinyint', width: 1, default: 1 })
  visible: boolean;

  @Column({ name: 'keep_alive', type: 'tinyint', width: 1, default: 1 })
  keepAlive: boolean;

  @Column({ length: 1, default: '0' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted' })
  deleted: Date;

  children?: MenuEntity[];
}
