import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { DeptEntity } from './dept.entity';

@Entity('sys_user')
export class UserEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'dept_id', type: 'bigint', nullable: true })
  deptId: number | null;

  @Column({ length: 32, comment: '登录账号' })
  username: string;

  @Column({ length: 32, comment: '用户昵称' })
  nickname: string;

  @Column({ length: 64, default: '' })
  email: string;

  @Column({ length: 18, default: '' })
  phone: string;

  @Column({ length: 1, default: '0', comment: '性别 0未知 1男 2女' })
  gender: string;

  @Column({ length: 255, default: '' })
  avatar: string;

  @Column({ length: 100, select: false, comment: 'bcrypt 密码' })
  password: string;

  @Column({ length: 255, default: '' })
  signature: string;

  @Column({ length: 1, default: '0', comment: '0正常 1停用' })
  status: string;

  @Column({ name: 'last_login_at', type: 'datetime', nullable: true })
  lastLoginAt: Date;

  @Column({ name: 'last_login_ip', length: 64, default: '' })
  lastLoginIp: string;

  @Column({ name: 'login_count', type: 'int', default: 0 })
  loginCount: number;

  @Column({ name: 'created_by', length: 32, default: '' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted' })
  deleted: Date;

  @ManyToOne(() => DeptEntity)
  @JoinColumn({ name: 'dept_id' })
  dept: DeptEntity;

  roleIds?: number[];
  roleNames?: string[];
  deptName?: string;
}
