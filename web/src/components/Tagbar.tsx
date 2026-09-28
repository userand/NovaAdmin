import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { Button } from '@/ui/button';
import { useUIStore } from '@/stores/ui';
import { cn } from '@/lib/utils';

export default function Tagbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { tags, removeTag, closeOthers } = useUIStore();

  return (
    <div className="bg-background flex h-10 shrink-0 items-center gap-1 border-b px-3">
      {tags.map((tag) => {
        const active = location.pathname === tag.path;
        return (
          <div
            key={tag.path}
            onClick={() => navigate(tag.path)}
            className={cn(
              'group flex h-6 cursor-pointer items-center gap-1.5 rounded-md border px-2 text-xs transition-colors',
              active
                ? 'bg-primary text-primary-foreground border-primary'
                : 'text-muted-foreground hover:text-foreground border-transparent hover:border-border',
            )}
          >
            <span>{tag.title}</span>
            {tag.path !== '/dashboard' && (
              <button
                type="button"
                className="opacity-50 transition-opacity group-hover:opacity-100 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  const next = removeTag(tag.path);
                  if (active && next) navigate(next);
                }}
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        );
      })}

      <div className="flex-1" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
            更多
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => closeOthers(location.pathname)}>关闭其他</DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              useUIStore.setState({ tags: [{ path: '/dashboard', title: '仪表盘' }] });
              navigate('/dashboard');
            }}
          >
            全部关闭
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
