import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sys_role_menu')
export class RoleMenuEntity {
  @Column({ name: 'role_id', type: 'bigint', primary: true })
  roleId: number;

  @Column({ name: 'menu_id', type: 'bigint', primary: true })
  menuId: number;
}
