import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'required_permission';

/** 声明接口所需权限标识，如 @RequirePermission('system:user:create') */
export const RequirePermission = (...perms: string[]) => SetMetadata(PERMISSION_KEY, perms);
