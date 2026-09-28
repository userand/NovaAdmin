import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('sys_dict_data')
export class DictDataEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'type_code', length: 64, comment: '所属字典编码' })
  typeCode: string;

  @Column({ length: 64, comment: '标签' })
  label: string;

  @Column({ length: 64, comment: '键值' })
  value: string;

  @Column({ name: 'tag_type', length: 32, default: '' })
  tagType: string;

  @Column({ name: 'order_num', type: 'int', default: 0 })
  orderNum: number;

  @Column({ length: 1, default: '0' })
  status: string;

  @Column({ length: 255, default: '' })
  remark: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted' })
  deleted: Date;
}
