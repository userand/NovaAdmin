import { SetMetadata } from '@nestjs/common';

export const LOG_METADATA_KEY = 'operation:log';

export interface LogMetadata {
  /** 操作模块，如「用户管理」 */
  title: string;
  /** 操作动作，如「新增」 */
  action?: string;
}

/**
 * 操作日志注解：记录写操作到 sys_operation_log
 * @example @OperationLog('用户管理', '新增')
 */
export const OperationLog = (title: string, action?: string) =>
  SetMetadata(LOG_METADATA_KEY, { title, action } satisfies LogMetadata);
