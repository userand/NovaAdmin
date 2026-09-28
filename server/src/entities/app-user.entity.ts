import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

/** 会员(移动端/C 端用户)。与后台账号 sys_user 完全独立：独立表、独立令牌。 */
@Entity('app_user')
export class AppUserEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 64 })
  nickname: string;

  @Column({ length: 255, default: '' })
  avatar: string;

  @Column({ length: 1, default: '0', comment: '性别 0未知 1男 2女' })
  gender: string;

  @Column({ type: 'date', nullable: true })
  birthday: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, select: false, comment: 'bcrypt 密码，空=未设置' })
  password: string | null;

  @Column({ length: 1, default: '0', comment: '0正常 1停用' })
  status: string;

  @Column({ length: 16, default: 'phone', comment: '注册来源 phone/email/wechat/admin' })
  source: string;

  @Column({ length: 255, default: '' })
  remark: string;

  @Column({ name: 'token_version', type: 'int', default: 0 })
  tokenVersion: number;

  @Column({ name: 'last_login_at', type: 'datetime', nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'last_login_ip', length: 64, default: '' })
  lastLoginIp: string;

  @Column({ name: 'login_count', type: 'int', default: 0 })
  loginCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted' })
  deleted: Date;
}
