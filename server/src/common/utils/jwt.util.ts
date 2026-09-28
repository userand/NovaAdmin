/**
 * JWT 密钥/有效期的统一读取：签发、验证、守卫共用同一份兜底值，
 * 避免 .env 缺失时出现"能签发却验不过"的不一致。
 */
export const jwtAccessSecret = () => process.env.JWT_SECRET || 'nova-admin-dev-secret';
export const jwtRefreshSecret = () => process.env.JWT_REFRESH_SECRET || 'nova-admin-dev-refresh';
export const jwtAccessExpires = () => process.env.JWT_EXPIRES || '2h';
export const jwtRefreshExpires = () => process.env.JWT_REFRESH_EXPIRES || '7d';
