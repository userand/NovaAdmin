import { Global, Module } from '@nestjs/common';
import { RbacService } from './rbac.service';

/**
 * 全局 RBAC 模块：权限集合查询、用户菜单、数据范围，供守卫与各业务模块复用
 */
@Global()
@Module({
  providers: [RbacService],
  exports: [RbacService],
})
export class RbacModule {}
