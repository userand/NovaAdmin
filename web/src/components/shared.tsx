import type { ReactNode } from 'react';
import { Button } from '@/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function PageHeader({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {desc && <p className="text-muted-foreground mt-1 text-[13px]">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function Pager({
  page, pageSize, total, onPage, onPageSize,
}: {
  page: number; pageSize: number; total: number;
  onPage: (p: number) => void; onPageSize: (s: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const nums: number[] = [];
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  for (let i = start; i < start + 5 && i <= pages; i++) nums.push(i);

  return (
    <div className="mt-4 flex items-center justify-between">
      <span className="text-muted-foreground text-xs">共 {total} 条</span>
      <div className="flex items-center gap-1">
        <Select value={String(pageSize)} onValueChange={(v) => onPageSize(Number(v))}>
          <SelectTrigger size="sm" className="w-[92px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 50].map((s) => (
              <SelectItem key={s} value={String(s)} className="text-xs">{s} 条/页</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="size-7" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="size-3.5" />
        </Button>
        {nums.map((n) => (
          <Button
            key={n}
            variant={n === page ? 'default' : 'outline'}
            size="icon"
            className="size-7 text-xs"
            onClick={() => onPage(n)}
          >
            {n}
          </Button>
        ))}
        <Button variant="outline" size="icon" className="size-7" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return status === '0'
    ? <Badge variant="success" className="text-[11px]">正常</Badge>
    : <Badge variant="destructive" className="text-[11px]">停用</Badge>;
}

import { Badge } from '@/ui/badge';

/** 权限按钮: 无权限时隐藏 */
export function Can({ perm, children }: { perm: string; children: ReactNode }) {
  const has = useAuthHasPermission(perm);
  return has ? <>{children}</> : null;
}

import { useAuthStore } from '@/stores/auth';
function useAuthHasPermission(perm: string) {
  return useAuthStore((s) => {
    if (s.userInfo?.isSuperAdmin || s.permissions.includes('*')) return true;
    // 兜底：roles 含 super_admin 同样视为超管(旧 persist 无 isSuperAdmin 字段)
    if (s.userInfo?.roles?.includes('super_admin')) return true;
    return s.permissions.includes(perm);
  });
}
