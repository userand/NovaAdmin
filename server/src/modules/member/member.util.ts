import type { Request } from 'express';
import { parseUserAgent, ipToLocation } from '../../common/utils/user-agent.util';

export const PHONE_RE = /^1[3-9]\d{9}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PASSWORD_RE = /^(?=.*[a-zA-Z])(?=.*\d).{8,32}$/;

export const isPhone = (v: string) => PHONE_RE.test(v);
export const isEmail = (v: string) => EMAIL_RE.test(v);
/** 邮箱统一小写去空格，避免同一邮箱因大小写重复注册 */
export const normEmail = (v: string) => v.trim().toLowerCase();

export function maskPhone(phone?: string | null) {
  return phone ? phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2') : '';
}
export function maskEmail(email?: string | null) {
  if (!email) return '';
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}***@${domain}`;
}

/** 一次请求的客户端上下文(用于登录日志) */
export interface ClientContext {
  ip: string;
  os: string;
  location: string;
  /** X-Client 请求头：ios / android / mp / h5 … */
  client: string;
}

export function clientContext(req: Request): ClientContext {
  const ip = req.ip || '';
  const ua = parseUserAgent(req.headers['user-agent'] as string);
  const client = String(req.headers['x-client'] || '').toLowerCase().slice(0, 16);
  return { ip, os: ua.os, location: ipToLocation(ip), client };
}
