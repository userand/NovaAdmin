import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

/** 会员第三方身份(微信小程序 / 移动应用 / 公众号)。同一会员可绑定多个。 */
@Entity('app_user_identity')
export class AppUserIdentityEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @Column({ length: 16, comment: 'wechat_mp / wechat_app / wechat_h5' })
  provider: string;

  @Column({ name: 'open_id', length: 64 })
  openId: string;

  @Column({ name: 'union_id', type: 'varchar', length: 64, nullable: true })
  unionId: string | null;

  @Column({ length: 64, default: '' })
  nickname: string;

  @Column({ length: 255, default: '' })
  avatar: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
