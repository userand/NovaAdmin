import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, type UserInfo, type RouteMenu } from '@/api';
import { clearAuth } from '@/api/request';

interface AuthState {
  token: string;
  userInfo: UserInfo | null;
  permissions: string[];
  menus: RouteMenu[];
  login: (payload: { username: string; password: string; captchaId: string; captchaCode: string }) => Promise<void>;
  fetchRoutes: () => Promise<RouteMenu[]>;
  /** 从后端同步当前用户信息、权限集合与菜单(页面加载时调用，兼顾持久化丢失/权限变更) */
  restoreSession: () => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (perm: string) => boolean;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: '',
      userInfo: null,
      permissions: [],
      menus: [],

      async login(payload) {
        const { data: env } = await authApi.login(payload);
        const res = env.data;
        localStorage.setItem('nova.access_token', JSON.stringify(res.accessToken));
        localStorage.setItem('nova.refresh_token', JSON.stringify(res.refreshToken));
        const routesRes = await authApi.getRoutes();
        set({
          token: res.accessToken,
          userInfo: res.userInfo,
          permissions: res.permissions,
          menus: routesRes.data.data,
        });
      },

      async fetchRoutes() {
        const { data: env } = await authApi.getRoutes();
        set({ menus: env.data });
        return env.data;
      },

      async restoreSession() {
        // 每次页面加载都与后端同步权限与菜单：角色被调整后无需重新登录即可生效
        const [profileRes, routesRes] = await Promise.all([authApi.getProfile(), authApi.getRoutes()]);
        const p = profileRes.data.data;
        set({
          userInfo: {
            id: p.id,
            username: p.username,
            nickname: p.nickname,
            avatar: p.avatar,
            deptId: p.deptId,
            roles: p.roles.map((r) => r.code),
            roleNames: p.roles.map((r) => r.name),
            isSuperAdmin: p.isSuperAdmin,
          },
          permissions: p.permissions,
          menus: routesRes.data.data,
        });
      },

      async logout() {
        try {
          await authApi.logout();
        } catch {
          /* ignore */
        }
        get().reset();
      },

      hasPermission(perm: string) {
        const { userInfo, permissions } = get();
        if (userInfo?.isSuperAdmin || permissions.includes('*')) return true;
        return permissions.includes(perm);
      },

      reset() {
        clearAuth();
        set({ token: '', userInfo: null, permissions: [], menus: [] });
      },
    }),
    {
      name: 'nova-auth',
      partialize: (s) => ({ userInfo: s.userInfo, permissions: s.permissions, menus: s.menus }),
    },
  ),
);
