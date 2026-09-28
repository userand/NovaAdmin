import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { EyeOff } from 'lucide-react';
import { useUIStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import Tagbar from './Tagbar';
import GlobalSearch from './GlobalSearch';

/** 只读账号(无任何写权限)提示条，避免用户误以为系统故障 */
function ReadOnlyBanner() {
  const { userInfo, permissions } = useAuthStore();
  if (!userInfo || userInfo.isSuperAdmin || permissions.includes('*')) return null;
  const writable = permissions.some((p) => /:(create|update|delete|resetPwd)$/.test(p));
  if (writable) return null;
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/25 text-amber-700 dark:text-amber-400 flex h-8 shrink-0 items-center justify-center gap-2 px-4 text-xs">
      <EyeOff className="size-3.5" />
      <span>
        当前账号「{userInfo.nickname}」为只读权限，仅可查看数据。如需新增/编辑/删除，请使用
        <button
          type="button"
          className="mx-1 font-semibold underline underline-offset-2 hover:opacity-80"
          onClick={() => {
            localStorage.removeItem('nova.access_token');
            localStorage.removeItem('nova.refresh_token');
            localStorage.removeItem('nova-auth');
            window.location.href = '/login';
          }}
        >
          admin
        </button>
        账号登录
      </span>
    </div>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const { addTag } = useUIStore();

  useEffect(() => {
    if (location.pathname === '/login') return;
    const title = (location.state?.title as string) || routeTitle(location.pathname);
    if (title) addTag({ path: location.pathname, title });
  }, [location.pathname, location.state, addTag]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <Tagbar />
        <ReadOnlyBanner />
        <main className="bg-background flex-1 overflow-y-auto">
          {/* key=路径：每次切换页面重播一次轻微的淡入上浮 */}
          <div key={location.pathname} className="page-enter mx-auto w-full max-w-[1400px] p-6">
            <Outlet />
          </div>
        </main>
      </div>
      <GlobalSearch />
    </div>
  );
}

const titleMap: Record<string, string> = {
  '/dashboard': '仪表盘',
  '/system/user': '用户管理',
  '/system/role': '角色管理',
  '/system/menu': '菜单管理',
  '/system/dept': '部门管理',
  '/system/dict': '字典管理',
  '/system/config': '参数设置',
  '/system/notice': '通知公告',
  '/system/log/login': '登录日志',
  '/system/log/operation': '操作日志',
  '/member/list': '会员管理',
  '/member/setting': '登录方式',
  '/member/log': '会员登录日志',
  '/profile': '个人中心',
};

function routeTitle(path: string) {
  return titleMap[path];
}
