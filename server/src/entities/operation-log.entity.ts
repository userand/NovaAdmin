import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sys_operation_log')
export class OperationLogEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 64, comment: '操作模块' })
  title: string;

  @Column({ length: 64, default: '' })
  action: string;

  @Column({ length: 10, default: '' })
  method: string;

  @Column({ length: 255, default: '' })
  url: string;

  @Column({ type: 'text', nullable: true })
  params: string;

  @Column({ length: 64, default: '' })
  ip: string;

  @Column({ length: 64, default: '' })
  username: string;

  @Column({ length: 1, default: '0', comment: '0成功 1失败' })
  status: string;

  @Column({ name: 'error_msg', length: 512, default: '' })
  errorMsg: string;

  @Column({ name: 'cost_ms', type: 'int', default: 0 })
  costMs: number;

  @Column({ name: 'oper_time', type: 'datetime' })
  operTime: Date;
}
