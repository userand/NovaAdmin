import { useEffect, useState } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

/**
 * 认证 + 菜单守卫：
 * - 无 token → /login
 * - 每次页面加载都与后端同步一次用户信息/权限/菜单(权限变更无需重新登录；持久化缺失时也由此恢复)
 * - 路径不在用户菜单(或保留页) → 404
 *
 * 注意：同步只在挂载时执行一次，不依赖 userInfo/permissions 等会被同步本身改写的状态，
 * 因此没有任何权限/菜单的账号不会陷入"恢复 → 状态变化 → 再恢复"的循环。
 */
export default function RequireAuth({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const hasToken = !!localStorage.getItem('nova.access_token');
  const { menus, userInfo, restoreSession } = useAuthStore();
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!hasToken) return;
    let cancelled = false;
    restoreSession()
      .catch(() => {
        // 401 已由请求拦截器处理(刷新令牌/跳登录)；其余错误在有本地缓存时沿用缓存，否则视为会话失效
        if (!useAuthStore.getState().userInfo) useAuthStore.getState().reset();
      })
      .finally(() => {
        if (!cancelled) setSynced(true);
      });
    return () => {
      cancelled = true;
    };
  }, [hasToken, restoreSession]);

  if (!hasToken) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // 菜单可见性校验(个人中心/仪表盘/404 页始终允许)
  const allowed = new Set<string>(['/dashboard', '/profile', '/404']);
  const walk = (items: typeof menus) => {
    items.forEach((m) => {
      if (m.type !== 'F' && m.path) allowed.add(m.path);
      if (m.children?.length) walk(m.children);
    });
  };
  walk(menus);
  const path = location.pathname;
  const pathAllowed = allowed.has(path) || path === '/';

  // 用户信息缺失，或缓存的菜单不含当前路径而尚未与后端同步完成 → 等待同步结果再判定
  if (!userInfo || (!pathAllowed && !synced)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="bg-muted h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40" />
      </div>
    );
  }

  if (!pathAllowed) {
    return <Navigate to="/404" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
