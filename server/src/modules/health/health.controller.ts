import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Public } from '../../common/decorators/public.decorator';

/** 存活/就绪探针：容器编排(Docker healthcheck / K8s probe)与负载均衡使用，免认证 */
@ApiTags('健康检查')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: '健康检查(含数据库连通性)' })
  async check() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('数据库不可用');
    }
    return { status: 'ok', uptime: Math.round(process.uptime()) };
  }
}
