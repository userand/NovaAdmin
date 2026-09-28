import axios, { type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
import { toast } from 'sonner';

export interface ApiEnvelope<T = unknown> {
  code: number;
  message: string;
  data: T;
}

const request = axios.create({ baseURL: '/api', timeout: 20000 });

request.interceptors.request.use((config) => {
  const raw = localStorage.getItem('nova.access_token');
  if (raw) config.headers.Authorization = `Bearer ${JSON.parse(raw)}`;
  return config;
});

// ---- 刷新令牌(防并发) ----
let refreshing: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshing) {
    refreshing = (async () => {
      const raw = localStorage.getItem('nova.refresh_token');
      if (!raw) throw new Error('no refresh token');
      const res = await axios.post<ApiEnvelope<{ accessToken: string; refreshToken: string }>>(
        '/api/auth/refresh',
        { refreshToken: JSON.parse(raw) },
      );
      if (res.data.code !== 0) throw new Error(res.data.message);
      localStorage.setItem('nova.access_token', JSON.stringify(res.data.data.accessToken));
      localStorage.setItem('nova.refresh_token', JSON.stringify(res.data.data.refreshToken));
      return res.data.data.accessToken;
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

function redirectToLogin() {
  clearAuth();
  const redirect = encodeURIComponent(window.location.pathname + window.location.search);
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = `/login?redirect=${redirect}`;
  }
}

export function clearAuth() {
  localStorage.removeItem('nova.access_token');
  localStorage.removeItem('nova.refresh_token');
}

request.interceptors.response.use(
  async (response: AxiosResponse<ApiEnvelope>) => {
    const envelope = response.data;
    if (response.config.responseType === 'blob') return response;
    if (envelope.code === 0) return response;

    if (envelope.code === 401) {
      const original = response.config as InternalAxiosRequestConfig & { _retried?: boolean };
      if (!original._retried && localStorage.getItem('nova.refresh_token')) {
        original._retried = true;
        try {
          const token = await refreshAccessToken();
          original.headers.Authorization = `Bearer ${token}`;
          return request(original);
        } catch {
          /* fallthrough */
        }
      }
      toast.warning('登录已过期，请重新登录');
      redirectToLogin();
      return Promise.reject(new Error(envelope.message));
    }

    toast.error(envelope.message || '操作失败');
    return Promise.reject(new Error(envelope.message));
  },
  async (error) => {
    const status = error.response?.status;
    const message: string = error.response?.data?.message || '';
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    // 登录接口本身返回 401 = 账号密码错误/账号被锁定，展示服务端提示，不走"令牌过期"流程
    if (status === 401 && original?.url?.includes('/auth/login')) {
      toast.error(message || '账号或密码错误');
      return Promise.reject(error);
    }
    if (status === 401 && original && !original._retried && localStorage.getItem('nova.refresh_token')) {
      original._retried = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return request(original);
      } catch {
        /* fallthrough */
      }
    }
    if (status === 401) {
      toast.warning('登录已过期，请重新登录');
      redirectToLogin();
    } else if (status === 403) {
      toast.error(message || '没有操作权限');
    } else if (message) {
      toast.error(message);
    } else if (status && status >= 500) {
      toast.error('服务器错误，请稍后重试');
    } else if (error.code === 'ECONNABORTED') {
      toast.error('请求超时');
    } else if (!navigator.onLine) {
      toast.error('网络连接已断开');
    }
    return Promise.reject(error);
  },
);

export default request;
