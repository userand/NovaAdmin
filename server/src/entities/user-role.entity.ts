import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sys_user_role')
export class UserRoleEntity {
  @Column({ name: 'user_id', type: 'bigint', primary: true })
  userId: number;

  @Column({ name: 'role_id', type: 'bigint', primary: true })
  roleId: number;
}
