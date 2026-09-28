import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('app_login_log')
export class AppLoginLogEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId: number | null;

  @Column({ length: 128, default: '' })
  account: string;

  @Column({ length: 16, comment: 'phone_code/email_code/password/wechat/refresh' })
  method: string;

  @Column({ length: 16, default: '' })
  client: string;

  @Column({ length: 64, default: '' })
  ip: string;

  @Column({ length: 64, default: '' })
  location: string;

  @Column({ length: 64, default: '' })
  os: string;

  @Column({ length: 1, default: '0', comment: '0成功 1失败' })
  status: string;

  @Column({ length: 128, default: '' })
  message: string;

  @Column({ name: 'login_time', type: 'datetime' })
  loginTime: Date;
}
