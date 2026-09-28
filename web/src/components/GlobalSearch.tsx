import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, LogOut, Maximize, Moon, Search, Sun, UserRound } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/ui/dialog';
import { useUIStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { MenuIcon } from './MenuIcon';
import { cn } from '@/lib/utils';
import type { RouteMenu } from '@/api';

interface Item {
  id: string;
  group: string;
  label: string;
  icon: ReactNode;
  hint?: string;
  run: () => void;
}

/**
 * 全局搜索：Ctrl/⌘ + K 或点击顶栏搜索框打开。
 * 可按名称/路径搜索当前账号有权限访问的页面，并执行常用快捷操作(主题、全屏、退出)。
 */
export default function GlobalSearch() {
  const navigate = useNavigate();
  const { searchOpen, setSearchOpen, isDark, setDark } = useUIStore();
  const menus = useAuthStore((s) => s.menus);
  const logout = useAuthStore((s) => s.logout);
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // 全局快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(!useUIStore.getState().searchOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSearchOpen]);

  // 每次打开都重置
  useEffect(() => {
    if (searchOpen) {
      setQ('');
      setIdx(0);
    }
  }, [searchOpen]);

  const items = useMemo<Item[]>(() => {
    const go = (path: string) => () => navigate(path);
    const pages: Item[] = [];
    const walk = (list: RouteMenu[], parent?: string) => {
      list.forEach((m) => {
        if (m.type === 'F') return;
        if (m.type === 'C' && m.path) {
          pages.push({
            id: `page:${m.path}`,
            group: parent ? `页面 · ${parent}` : '页面',
            label: m.name,
            icon: <MenuIcon name={m.icon} className="size-4" />,
            hint: m.path,
            run: go(m.path),
          });
        }
        if (m.children?.length) walk(m.children, m.name);
      });
    };
    walk(menus);
    // 个人中心不在后端菜单里，始终可达
    if (!pages.some((p) => p.hint === '/profile')) {
      pages.push({ id: 'page:/profile', group: '页面', label: '个人中心', icon: <UserRound className="size-4" />, hint: '/profile', run: go('/profile') });
    }
    const actions: Item[] = [
      {
        id: 'act:theme',
        group: '快捷操作',
        label: isDark ? '切换到浅色模式' : '切换到深色模式',
        icon: isDark ? <Sun className="size-4" /> : <Moon className="size-4" />,
        run: () => setDark(!isDark),
      },
      {
        id: 'act:fullscreen',
        group: '快捷操作',
        label: '切换全屏',
        icon: <Maximize className="size-4" />,
        run: () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()),
      },
      {
        id: 'act:logout',
        group: '快捷操作',
        label: '退出登录',
        icon: <LogOut className="size-4" />,
        run: async () => {
          await logout();
          window.location.href = '/login';
        },
      },
    ];
    return [...pages, ...actions];
  }, [menus, isDark, navigate, setDark, logout]);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((c) => `${c.label} ${c.group} ${c.hint ?? ''}`.toLowerCase().includes(kw));
  }, [items, q]);

  useEffect(() => setIdx(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${idx}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [idx]);

  function exec(item?: Item) {
    if (!item) return;
    setSearchOpen(false);
    // 等对话框开始关闭后再执行，避免焦点与导航互相干扰
    window.setTimeout(item.run, 60);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIdx((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      exec(filtered[idx]);
    }
  }

  // 按分组渲染，同时保持全局连续的序号(键盘导航用)
  let cursor = -1;
  const groups = filtered.reduce<Record<string, (Item & { i: number })[]>>((acc, c) => {
    cursor += 1;
    (acc[c.group] ||= []).push({ ...c, i: cursor });
    return acc;
  }, {});

  return (
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
      <DialogContent
        showCloseButton={false}
        className="top-[16%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl"
        onKeyDown={onKeyDown}
      >
        <DialogTitle className="sr-only">搜索</DialogTitle>
        <DialogDescription className="sr-only">搜索页面或执行快捷操作</DialogDescription>

        <div className="flex items-center gap-3 border-b px-4">
          <Search className="text-muted-foreground size-4 shrink-0" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索页面或操作…"
            className="placeholder:text-muted-foreground h-12 flex-1 bg-transparent text-sm outline-none"
          />
          <kbd className="bg-muted text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-[340px] overflow-y-auto p-2">
          {filtered.length === 0 && <div className="text-muted-foreground py-10 text-center text-sm">没有匹配的结果</div>}
          {Object.entries(groups).map(([group, list]) => (
            <div key={group} className="mb-1 last:mb-0">
              <div className="text-muted-foreground px-2.5 pt-2 pb-1 text-xs font-medium">{group}</div>
              {list.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  data-idx={c.i}
                  onMouseMove={() => setIdx(c.i)}
                  onClick={() => exec(c)}
                  className={cn(
                    'flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13.5px] transition-colors',
                    c.i === idx ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
                  )}
                >
                  <span className="shrink-0">{c.icon}</span>
                  <span className={cn('flex-1 truncate', c.i === idx && 'text-foreground')}>{c.label}</span>
                  {c.hint && <span className="text-muted-foreground/70 font-mono text-[11px]">{c.hint}</span>}
                  {c.i === idx && <CornerDownLeft className="size-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="text-muted-foreground bg-muted/40 flex items-center gap-4 border-t px-4 py-2 text-[11px]">
          <span>↑↓ 选择</span>
          <span>↵ 打开</span>
          <span className="ml-auto">Esc 关闭</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
