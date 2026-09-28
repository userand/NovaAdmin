import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { MenuIcon } from './MenuIcon';
import { cn } from '@/lib/utils';
import type { RouteMenu } from '@/api';

const visibleItems = (items?: RouteMenu[]) => (items ?? []).filter((m) => m.type !== 'F' && m.visible);
const containsPath = (item: RouteMenu, pathname: string): boolean =>
  item.path === pathname || visibleItems(item.children).some((c) => containsPath(c, pathname));
/** 初始展开当前页面所属分组，否则第一个分组 */
const initialOpenId = (groups: RouteMenu[], pathname: string): number | null =>
  groups.find((g) => g.children?.length && containsPath(g, pathname))?.id ??
  groups.find((g) => g.children?.length)?.id ??
  null;

export default function Sidebar() {
  const menus = useAuthStore((s) => s.menus);
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const groups = menus.filter((m) => m.type !== 'F' && m.visible);

  // 手风琴：全局仅一个展开的分组
  const [openId, setOpenId] = useState<number | null>(() => initialOpenId(groups, pathname));
  // 经标签栏等途径切到其他分组页面时，自动展开对应分组
  useEffect(() => {
    const hit = groups.find((g) => g.children?.length && containsPath(g, pathname));
    if (hit) setOpenId((cur) => (cur === hit.id ? cur : hit.id));
  }, [pathname, menus]);

  return (
    <aside
      data-collapsed={sidebarCollapsed}
      className={cn(
        'bg-sidebar text-sidebar-foreground border-sidebar-border flex h-full shrink-0 flex-col border-r transition-[width] duration-200',
        sidebarCollapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="border-sidebar-border flex h-14 shrink-0 items-center gap-2.5 border-b px-4"
      >
        <span className="bg-primary text-primary-foreground grid size-7 shrink-0 place-items-center rounded-md text-sm font-bold">
          N
        </span>
        {!sidebarCollapsed && <span className="text-[15px] font-semibold tracking-tight">Nova Admin</span>}
      </button>

      {/* 菜单 */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2">
        <ul className="flex flex-col gap-0.5">
          {menus
            .filter((m) => m.type !== 'F' && m.visible)
            .map((menu) => (
              <li key={menu.id}>
                {menu.children?.length ? (
                  <GroupMenu
                    item={menu}
                    collapsed={sidebarCollapsed}
                    open={menu.id === openId}
                    onToggle={() => setOpenId((cur) => (cur === menu.id ? null : menu.id))}
                  />
                ) : (
                  <MenuLink item={menu} collapsed={sidebarCollapsed} />
                )}
              </li>
            ))}
        </ul>
      </nav>

      {/* 折叠按钮 */}
      <button
        type="button"
        onClick={toggleSidebar}
        className="border-sidebar-border text-muted-foreground hover:bg-sidebar-accent hover:text-foreground flex h-10 shrink-0 items-center justify-center gap-2 border-t text-xs transition-colors"
      >
        {sidebarCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        {!sidebarCollapsed && '收起'}
      </button>
    </aside>
  );
}

function MenuLink({ item, collapsed }: { item: RouteMenu; collapsed?: boolean }) {
  return (
    <NavLink
      to={item.path}
      title={collapsed ? item.name : undefined}
      className={({ isActive }) =>
        cn(
          'flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] transition-colors duration-150',
          // 收起态：只显示图标并居中，文字由 title 提示
          collapsed && 'justify-center px-0',
          isActive
            ? 'bg-primary text-primary-foreground font-medium shadow-[0_1px_2px_rgb(0_0_0/0.18),0_4px_10px_-4px_rgb(0_0_0/0.3)]'
            : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
        )
      }
    >
      <MenuIcon name={item.icon} className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.name}</span>}
    </NavLink>
  );
}

function GroupMenu({
  item,
  collapsed,
  open,
  onToggle,
}: {
  item: RouteMenu;
  collapsed: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  if (collapsed) {
    // 折叠态：点击跳到该分组下第一个页面；当前所在分组高亮
    const active = containsPath(item, pathname);
    return (
      <button
        type="button"
        onClick={() => {
          const first = item.children?.find((c) => c.type === 'C' && c.visible);
          if (first) navigate(first.path);
        }}
        className={cn(
          'relative flex h-9 w-full items-center justify-center rounded-md transition-colors',
          active
            ? 'bg-primary text-primary-foreground shadow-[0_1px_2px_rgb(0_0_0/0.18),0_4px_10px_-4px_rgb(0_0_0/0.3)]'
            : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
        )}
        title={item.name}
      >
        <MenuIcon name={item.icon} className="size-4 shrink-0" />
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'hover:bg-sidebar-accent hover:text-foreground flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13.5px] transition-colors',
          containsPath(item, pathname) ? 'text-foreground font-medium' : 'text-muted-foreground',
        )}
      >
        <MenuIcon name={item.icon} />
        <span className="flex-1 truncate text-left">{item.name}</span>
        <ChevronDown className={cn('size-4 transition-transform duration-200', !open && '-rotate-90')} />
      </button>
      {/* grid-rows 过渡：高度自适应的平滑折叠 */}
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          {item.children
            ?.filter((c) => c.type !== 'F' && c.visible)
            .map((child) => (
              <div key={child.id} className="mt-0.5 ml-4">
                <MenuLink item={child} />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
