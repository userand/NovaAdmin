import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('sys_notice')
export class NoticeEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 128, comment: '标题' })
  title: string;

  @Column({ length: 1, default: '1', comment: '1通知 2公告' })
  type: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ length: 1, default: '0', comment: '0发布 1下线' })
  status: string;

  @Column({ type: 'tinyint', width: 1, default: 0 })
  top: boolean;

  @Column({ name: 'created_by', length: 32, default: '' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted' })
  deleted: Date;
}
