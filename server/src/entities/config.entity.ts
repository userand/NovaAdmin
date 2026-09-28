import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('sys_config')
export class ConfigEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 64, comment: '参数名称' })
  name: string;

  @Column({ length: 64, comment: '参数键名' })
  key: string;

  @Column({ length: 255, default: '' })
  value: string;

  @Column({ name: 'is_builtin', type: 'tinyint', width: 1, default: 0 })
  isBuiltin: boolean;

  @Column({ length: 255, default: '' })
  remark: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted' })
  deleted: Date;
}
