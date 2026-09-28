import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  isDark: boolean;
  sidebarCollapsed: boolean;
  /** 搜索面板(Ctrl/⌘ K)开关，不持久化 */
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  tags: { path: string; title: string }[];
  setDark: (dark: boolean) => void;
  toggleSidebar: () => void;
  addTag: (tag: { path: string; title: string }) => void;
  removeTag: (path: string) => string | undefined;
  closeOthers: (path: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      isDark: false,
      sidebarCollapsed: false,
      searchOpen: false,
      setSearchOpen: (open) => set({ searchOpen: open }),
      tags: [{ path: '/dashboard', title: '仪表盘' }],

      setDark: (dark) => {
        const root = document.documentElement;
        // 短暂启用全局颜色过渡，让明暗切换像"渐变"而不是"闪切"
        root.classList.add('theme-fade');
        root.classList.toggle('dark', dark);
        window.setTimeout(() => root.classList.remove('theme-fade'), 450);
        set({ isDark: dark });
      },
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      addTag: (tag) => {
        if (!get().tags.some((t) => t.path === tag.path)) {
          set((s) => ({ tags: [...s.tags, tag] }));
        }
      },
      removeTag: (path) => {
        const tags = get().tags.filter((t) => t.path !== path);
        set({ tags });
        return tags[tags.length - 1]?.path;
      },
      closeOthers: (path) =>
        set((s) => ({
          tags: s.tags.filter((t) => t.path === path || t.path === '/dashboard'),
        })),
    }),
    {
      name: 'nova-ui',
      partialize: (s) => ({ isDark: s.isDark, sidebarCollapsed: s.sidebarCollapsed, tags: s.tags }),
      onRehydrateStorage: () => (state) => {
        if (state?.isDark) document.documentElement.classList.add('dark');
      },
    },
  ),
);
