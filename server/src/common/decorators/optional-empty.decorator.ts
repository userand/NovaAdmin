import { ValidateIf } from 'class-validator';

/**
 * 可选且允许空串：值为 undefined / null / '' 时跳过该字段的全部校验。
 * (@IsOptional 只放过 null/undefined，而表单里清空的选填项会以 '' 提交)
 */
export const IsOptionalOrEmpty = () =>
  ValidateIf((_obj, value) => value !== undefined && value !== null && value !== '');
