import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, Maximize, Moon, Search, Sun, UserRound } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/ui/avatar';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { noticeApi, type NoticeItem } from '@/api';

export default function Navbar() {
  const navigate = useNavigate();
  const { userInfo, logout } = useAuthStore();
  const { isDark, setDark, setSearchOpen } = useUIStore();
  const [notices, setNotices] = useState<NoticeItem[]>([]);

  useEffect(() => {
    noticeApi.latest(5).then(({ data }) => setNotices(data.data)).catch(() => {});
  }, []);

  async function handleLogout() {
    await logout();
    window.location.href = '/login';
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  }

  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b px-4 backdrop-blur">
      {/* 通知 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="size-4" />
            {notices.length > 0 && (
              <span className="bg-destructive absolute top-1.5 right-1.5 grid size-3.5 place-items-center rounded-full text-[9px] font-semibold text-white">
                {notices.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80">
          <DropdownMenuLabel className="text-[13px]">最新通知</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notices.map((n) => (
            <DropdownMenuItem key={n.id} className="flex items-start gap-2 py-2">
              <Badge variant={n.type === '2' ? 'success' : 'secondary'} className="mt-0.5">
                {n.type === '2' ? '公告' : '通知'}
              </Badge>
              <span className="text-[13px] leading-snug font-normal">{n.title}</span>
            </DropdownMenuItem>
          ))}
          {notices.length === 0 && (
            <div className="text-muted-foreground px-2 py-6 text-center text-xs">暂无通知</div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 搜索：点击或 Ctrl/⌘ K 打开全局搜索面板 */}
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="bg-muted/60 border-border/70 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground hidden h-8 w-60 cursor-pointer items-center justify-between rounded-md border px-3 text-[13px] transition-colors md:flex"
      >
        <span className="flex items-center gap-2">
          <Search className="size-3.5" />
          搜索…
        </span>
        <kbd className="bg-background pointer-events-none rounded border px-1.5 font-mono text-[10px]">
          {typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform) ? '⌘ K' : 'Ctrl K'}
        </kbd>
      </button>

      <div className="flex-1" />

      {/* 全屏 */}
      <Button variant="ghost" size="icon" onClick={toggleFullscreen} title="全屏">
        <Maximize className="size-4" />
      </Button>

      {/* 主题切换 */}
      <Button variant="ghost" size="icon" onClick={() => setDark(!isDark)} title={isDark ? '浅色模式' : '深色模式'}>
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>

      {/* 用户 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="hover:bg-accent flex h-9 items-center gap-2 rounded-full pr-2.5 pl-1 transition-colors"
          >
            <Avatar className="size-7">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {(userInfo?.nickname || 'A').slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <span className="text-[13px] font-medium">{userInfo?.nickname || userInfo?.username}</span>
            {userInfo?.roleNames?.[0] && (
              <Badge variant="secondary" className="hidden text-[10.5px] font-normal sm:inline-flex">
                {userInfo.roleNames[0]}
              </Badge>
            )}
            <ChevronDown className="text-muted-foreground size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel className="text-xs font-normal">
            <div className="text-foreground text-[13px] font-medium">{userInfo?.nickname}</div>
            <div className="text-muted-foreground">@{userInfo?.username}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/profile')}>
            <UserRound /> 个人中心
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleLogout}>
            <LogOut /> 退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
