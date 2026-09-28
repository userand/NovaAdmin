export const MAX_PAGE_SIZE = 100;

/** 规范化分页参数：非法/缺省回落默认值，pageSize 限制在 [1, MAX_PAGE_SIZE] */
export function normalizePage(page: unknown, pageSize: unknown, defaultSize = 10) {
  const p = Math.floor(Number(page));
  const s = Math.floor(Number(pageSize));
  return {
    page: Number.isFinite(p) && p >= 1 ? p : 1,
    pageSize: Number.isFinite(s) && s >= 1 ? Math.min(s, MAX_PAGE_SIZE) : defaultSize,
  };
}
