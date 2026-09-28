import request from './request';
import type { ApiEnvelope } from './request';

// ===== 共享类型 =====
export interface PageResult<T> { list: T[]; total: number; page: number; pageSize: number }
export interface RouteMenu {
  id: number;
  parentId: number;
  name: string;
  type: 'M' | 'C' | 'F';
  path: string;
  component: string;
  perms: string;
  icon: string;
  orderNum: number;
  visible: boolean;
  keepAlive: boolean;
  children?: RouteMenu[];
}

// ===== 认证 =====
export interface UserInfo {
  id: number; username: string; nickname: string; avatar: string;
  deptId: number | null; roles: string[]; roleNames: string[]; isSuperAdmin: boolean;
}
export interface ProfileInfo {
  id: number; username: string; nickname: string; email: string; phone: string;
  gender: string; avatar: string; signature: string; deptId: number | null; deptName: string;
  roles: { id: number; name: string; code: string }[];
  lastLoginAt: string; loginCount: number; createdAt: string;
  /** 会话恢复用 */
  permissions: string[];
  isSuperAdmin: boolean;
}

export const authApi = {
  getCaptcha: () => request.get<ApiEnvelope<{ captchaId: string; image: string }>>('/auth/captcha'),
  login: (data: { username: string; password: string; captchaId: string; captchaCode: string }) =>
    request.post<ApiEnvelope<{ accessToken: string; refreshToken: string; userInfo: UserInfo; permissions: string[] }>>('/auth/login', data),
  logout: () => request.post<ApiEnvelope<null>>('/auth/logout'),
  getProfile: () => request.get<ApiEnvelope<ProfileInfo>>('/auth/profile'),
  getRoutes: () => request.get<ApiEnvelope<RouteMenu[]>>('/auth/routes'),
  updateProfile: (data: Partial<Pick<ProfileInfo, 'nickname' | 'signature' | 'email' | 'phone' | 'gender'>>) =>
    request.put<ApiEnvelope<ProfileInfo>>('/auth/profile', data),
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    request.put<ApiEnvelope<null>>('/auth/password', data),
};

// ===== 用户 =====
export interface SystemUser {
  id: number; username: string; nickname: string; email: string; phone: string;
  gender: string; avatar: string; signature: string; status: string;
  deptId: number | null; deptName: string;
  roles: { id: number; name: string; code: string }[];
  lastLoginAt: string; loginCount: number; createdAt: string;
}
export interface UserForm {
  id?: number; username?: string; nickname: string; email?: string; phone?: string;
  gender?: string; password?: string; deptId?: number | null; roleIds?: number[]; status?: string;
}

export const userApi = {
  page: (params: Record<string, unknown>) => request.get<ApiEnvelope<PageResult<SystemUser>>>('/users', { params }),
  detail: (id: number) => request.get<ApiEnvelope<UserForm & { roleIds: number[] }>>(`/users/${id}`),
  create: (data: UserForm) => request.post<ApiEnvelope<{ id: number }>>('/users', data),
  update: (id: number, data: UserForm) => request.put<ApiEnvelope<null>>(`/users/${id}`, data),
  remove: (id: number) => request.delete<ApiEnvelope<null>>(`/users/${id}`),
  resetPassword: (id: number, password: string) => request.put<ApiEnvelope<null>>(`/users/${id}/password`, { password }),
};

// ===== 角色 =====
export interface SystemRole {
  id: number; name: string; code: string; orderNum: number; dataScope: string;
  remark: string; status: string; createdAt: string; userCount: number; menuIds: number[];
}
export interface RoleForm {
  id?: number; name: string; code: string; orderNum?: number; dataScope?: string;
  remark?: string; status?: string; menuIds?: number[];
}

export const roleApi = {
  page: (params: Record<string, unknown>) => request.get<ApiEnvelope<PageResult<SystemRole>>>('/roles', { params }),
  options: () => request.get<ApiEnvelope<{ id: number; name: string; code: string }[]>>('/roles/options'),
  menuTree: () => request.get<ApiEnvelope<RouteMenu[]>>('/roles/menu-tree'),
  detail: (id: number) => request.get<ApiEnvelope<RoleForm & { menuIds: number[] }>>(`/roles/${id}`),
  create: (data: RoleForm) => request.post<ApiEnvelope<{ id: number }>>('/roles', data),
  update: (id: number, data: RoleForm) => request.put<ApiEnvelope<null>>(`/roles/${id}`, data),
  remove: (id: number) => request.delete<ApiEnvelope<null>>(`/roles/${id}`),
};

// ===== 菜单 =====
export interface MenuTreeNode extends Omit<RouteMenu, 'children'> {
  status: string;
  children?: MenuTreeNode[];
}
export interface MenuForm {
  id?: number; parentId: number; name: string; type: 'M' | 'C' | 'F';
  path?: string; component?: string; perms?: string; icon?: string; orderNum?: number;
  visible?: boolean; keepAlive?: boolean; status?: string;
}

export const menuApi = {
  tree: (keyword?: string) => request.get<ApiEnvelope<MenuTreeNode[]>>('/menus', { params: { keyword } }),
  detail: (id: number) => request.get<ApiEnvelope<MenuForm>>(`/menus/${id}`),
  create: (data: MenuForm) => request.post<ApiEnvelope<{ id: number }>>('/menus', data),
  update: (id: number, data: MenuForm) => request.put<ApiEnvelope<null>>(`/menus/${id}`, data),
  remove: (id: number) => request.delete<ApiEnvelope<null>>(`/menus/${id}`),
};

// ===== 部门 =====
export interface DeptTreeNode {
  id: number; parentId: number; name: string; orderNum: number; leader: string;
  phone: string; email: string; status: string; createdAt: string; children?: DeptTreeNode[];
}
export interface DeptForm {
  id?: number; parentId: number; name: string; orderNum?: number;
  leader?: string; phone?: string; email?: string; status?: string;
}

export const deptApi = {
  tree: (params?: { keyword?: string; status?: string }) => request.get<ApiEnvelope<DeptTreeNode[]>>('/depts', { params }),
  options: () => request.get<ApiEnvelope<{ id: number; parentId: number; name: string }[]>>('/depts/options'),
  create: (data: DeptForm) => request.post<ApiEnvelope<{ id: number }>>('/depts', data),
  update: (id: number, data: DeptForm) => request.put<ApiEnvelope<null>>(`/depts/${id}`, data),
  remove: (id: number) => request.delete<ApiEnvelope<null>>(`/depts/${id}`),
};

// ===== 字典 =====
export interface DictType { id: number; name: string; code: string; status: string; remark: string; createdAt: string; dataCount: number }
export interface DictData { id: number; typeCode: string; label: string; value: string; tagType: string; orderNum: number; status: string; remark: string; createdAt: string }
export type DictItem = { label: string; value: string; tagType: string };

export const dictApi = {
  typePage: (params: Record<string, unknown>) => request.get<ApiEnvelope<PageResult<DictType>>>('/dict/types', { params }),
  createType: (data: { name: string; code: string; status?: string; remark?: string }) => request.post<ApiEnvelope<{ id: number }>>('/dict/types', data),
  updateType: (id: number, data: { name: string; code: string; status?: string; remark?: string }) => request.put<ApiEnvelope<null>>(`/dict/types/${id}`, data),
  removeType: (id: number) => request.delete<ApiEnvelope<null>>(`/dict/types/${id}`),
  dataList: (typeCode: string, keyword?: string) => request.get<ApiEnvelope<DictData[]>>('/dict/datas', { params: { typeCode, keyword } }),
  createData: (data: Omit<DictData, 'id' | 'createdAt'>) => request.post<ApiEnvelope<{ id: number }>>('/dict/datas', data),
  updateData: (id: number, data: Omit<DictData, 'id' | 'createdAt'>) => request.put<ApiEnvelope<null>>(`/dict/datas/${id}`, data),
  removeData: (id: number) => request.delete<ApiEnvelope<null>>(`/dict/datas/${id}`),
  map: (codes: string[]) => request.get<ApiEnvelope<Record<string, DictItem[]>>>('/dict/map', { params: { codes: codes.join(',') } }),
};

// ===== 参数 / 通知 =====
export interface SysConfig { id: number; name: string; key: string; value: string; isBuiltin: boolean; remark: string; createdAt: string }
export const configApi = {
  page: (params: Record<string, unknown>) => request.get<ApiEnvelope<PageResult<SysConfig>>>('/configs', { params }),
  create: (data: { name: string; key: string; value: string; remark?: string }) => request.post<ApiEnvelope<{ id: number }>>('/configs', data),
  update: (id: number, data: { name: string; key: string; value: string; remark?: string }) => request.put<ApiEnvelope<null>>(`/configs/${id}`, data),
  remove: (id: number) => request.delete<ApiEnvelope<null>>(`/configs/${id}`),
};

export interface NoticeItem { id: number; title: string; type: string; content: string; status: string; top: boolean; createdBy: string; createdAt: string }
export const noticeApi = {
  page: (params: Record<string, unknown>) => request.get<ApiEnvelope<PageResult<NoticeItem>>>('/notices', { params }),
  latest: (limit = 5) => request.get<ApiEnvelope<NoticeItem[]>>('/notices/latest', { params: { limit } }),
  create: (data: { title: string; type: string; content?: string; status?: string; top?: string }) => request.post<ApiEnvelope<{ id: number }>>('/notices', data),
  update: (id: number, data: { title: string; type: string; content?: string; status?: string; top?: string }) => request.put<ApiEnvelope<null>>(`/notices/${id}`, data),
  remove: (id: number) => request.delete<ApiEnvelope<null>>(`/notices/${id}`),
};

// ===== 日志 =====
export interface LoginLogItem { id: number; username: string; ip: string; location: string; browser: string; os: string; status: string; message: string; login_time: string }
export interface OperationLogItem { id: number; title: string; action: string; method: string; url: string; params: string | null; ip: string; username: string; status: string; error_msg: string; cost_ms: number; oper_time: string }
export const logApi = {
  loginLogs: (params: Record<string, unknown>) => request.get<ApiEnvelope<PageResult<LoginLogItem>>>('/logs/login', { params }),
  operationLogs: (params: Record<string, unknown>) => request.get<ApiEnvelope<PageResult<OperationLogItem>>>('/logs/operation', { params }),
  clearLoginLogs: () => request.post<ApiEnvelope<null>>('/logs/login/clear'),
  clearOperationLogs: () => request.post<ApiEnvelope<null>>('/logs/operation/clear'),
};

// ===== 仪表盘 =====
export interface DashboardStats { totalUsers: number; activeUsers7d: number; operations7d: number; notices: number; onlineToday: number }
export interface TrendPoint { day: string; success: number; failed: number }
export interface NameValue { name: string; value: number }
export interface RecentLogin { username: string; ip: string; browser: string; os: string; status: string; message: string; login_time: string }

export const dashboardApi = {
  stats: () => request.get<ApiEnvelope<DashboardStats>>('/dashboard/stats'),
  loginTrend: () => request.get<ApiEnvelope<TrendPoint[]>>('/dashboard/login-trend'),
  deptDistribution: () => request.get<ApiEnvelope<NameValue[]>>('/dashboard/dept-distribution'),
  genderRatio: () => request.get<ApiEnvelope<NameValue[]>>('/dashboard/gender-ratio'),
  recentLogins: () => request.get<ApiEnvelope<RecentLogin[]>>('/dashboard/recent-logins'),
};

// ===== 会员中心(C 端用户 · 手机/邮箱/微信登录) =====
export interface MemberItem {
  id: number; nickname: string; avatar: string; gender: string;
  /** 列表中的手机号/邮箱为脱敏值 */
  phone: string; email: string; hasPhone: boolean; hasEmail: boolean;
  wechat: ('mp' | 'app' | 'h5')[]; source: string; status: string;
  lastLoginAt: string | null; loginCount: number; createdAt: string;
}
export interface MemberDetail {
  id: number; nickname: string; avatar: string; gender: string; birthday: string | null;
  phone: string; email: string; status: string; source: string; remark: string; hasPassword: boolean;
  lastLoginAt: string | null; lastLoginIp: string; loginCount: number; createdAt: string;
  identities: { id: number; provider: string; openId: string; nickname: string; createdAt: string }[];
  recentLogins: { id: number; method: string; client: string; ip: string; location: string; os: string; status: string; message: string; login_time: string }[];
}
export interface MemberForm {
  id?: number; nickname: string; phone?: string; email?: string; password?: string;
  gender?: string; status?: string; remark?: string;
}
export interface MemberStats {
  total: number; todayNew: number; active7d: number; disabled: number; wechatBound: number;
  bySource: { source: string; count: number }[];
}
export interface MemberSettings {
  switches: { register: boolean; phone: boolean; email: boolean; password: boolean; wechat: boolean };
  providers: {
    sms: { provider: string; configured: boolean };
    email: { configured: boolean };
    wechat: { mock: boolean; platforms: Record<'mp' | 'app' | 'h5', boolean> };
  };
}
export interface MemberLogItem {
  id: number; user_id: number | null; nickname: string | null; account: string; method: string;
  client: string; ip: string; location: string; os: string; status: string; message: string; login_time: string;
}

export const memberApi = {
  page: (params: Record<string, unknown>) => request.get<ApiEnvelope<PageResult<MemberItem>>>('/members', { params }),
  stats: () => request.get<ApiEnvelope<MemberStats>>('/members/stats'),
  detail: (id: number) => request.get<ApiEnvelope<MemberDetail>>(`/members/${id}`),
  create: (data: MemberForm) => request.post<ApiEnvelope<{ id: number }>>('/members', data),
  update: (id: number, data: MemberForm) => request.put<ApiEnvelope<null>>(`/members/${id}`, data),
  resetPassword: (id: number, password: string) => request.put<ApiEnvelope<null>>(`/members/${id}/password`, { password }),
  kick: (id: number) => request.post<ApiEnvelope<null>>(`/members/${id}/kick`),
  unbind: (id: number, identityId: number) => request.delete<ApiEnvelope<null>>(`/members/${id}/identities/${identityId}`),
  remove: (id: number) => request.delete<ApiEnvelope<null>>(`/members/${id}`),
  settings: () => request.get<ApiEnvelope<MemberSettings>>('/members/settings'),
  saveSettings: (data: Partial<MemberSettings['switches']>) => request.put<ApiEnvelope<MemberSettings>>('/members/settings', data),
  logs: (params: Record<string, unknown>) => request.get<ApiEnvelope<PageResult<MemberLogItem>>>('/members/logs', { params }),
};
