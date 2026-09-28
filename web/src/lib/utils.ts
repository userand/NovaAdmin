import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 权限判断的 UI 端便捷函数 */
export function formatTime(value?: string | Date | null, pattern = 'YYYY-MM-DD HH:mm') {
  if (!value) return '—';
  return dayjsFormat(value, pattern);
}

import dayjs from 'dayjs';
function dayjsFormat(value: string | Date, pattern: string) {
  return dayjs(value).format(pattern);
}
