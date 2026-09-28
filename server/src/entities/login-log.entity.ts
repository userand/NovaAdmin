import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sys_login_log')
export class LoginLogEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 64 })
  username: string;

  @Column({ length: 64, default: '' })
  ip: string;

  @Column({ length: 64, default: '' })
  location: string;

  @Column({ length: 64, default: '' })
  browser: string;

  @Column({ length: 64, default: '' })
  os: string;

  @Column({ length: 1, default: '0', comment: '0成功 1失败' })
  status: string;

  @Column({ length: 128, default: '' })
  message: string;

  @Column({ name: 'login_time', type: 'datetime' })
  loginTime: Date;
}
