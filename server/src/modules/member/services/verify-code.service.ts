import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { CodeChannel, CodeScene, NotifyService } from '../notify/notify.service';

const CODE_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const DAILY_LIMIT = 10;
const MAX_ATTEMPTS = 5;

interface CodeEntry {
  code: string;
  expireAt: number;
  attempts: number;
}

/**
 * 短信/邮件验证码：6 位数字，5 分钟有效，同一目标 60 秒冷却 + 每日 10 次上限，
 * 校验错误 5 次即作废。内存存储(单机)，多实例部署请换 Redis。
 */
@Injectable()
export class VerifyCodeService {
  private readonly codes = new Map<string, CodeEntry>();
  private readonly lastSent = new Map<string, number>();
  private readonly daily = new Map<string, { day: string; count: number }>();

  constructor(private readonly notify: NotifyService) {}

  async send(scene: CodeScene, channel: CodeChannel, target: string) {
    const now = Date.now();
    const gateKey = `${channel}:${target}`;

    const last = this.lastSent.get(gateKey) ?? 0;
    if (now - last < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - last)) / 1000);
      throw new HttpException(`发送过于频繁，请 ${wait} 秒后再试`, HttpStatus.TOO_MANY_REQUESTS);
    }
    const today = new Date().toISOString().slice(0, 10);
    const d = this.daily.get(gateKey);
    const count = d && d.day === today ? d.count : 0;
    if (count >= DAILY_LIMIT) throw new HttpException('今日验证码发送次数已达上限', HttpStatus.TOO_MANY_REQUESTS);

    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    const codeKey = `${scene}:${target}`;
    this.codes.set(codeKey, { code, expireAt: now + CODE_TTL_MS, attempts: 0 });
    this.lastSent.set(gateKey, now);
    this.daily.set(gateKey, { day: today, count: count + 1 });

    try {
      await this.notify.sendCode(channel, target, code, scene);
    } catch (err) {
      // 下发失败：撤销本次占用的额度，允许用户立即重试
      this.codes.delete(codeKey);
      this.lastSent.delete(gateKey);
      this.daily.set(gateKey, { day: today, count });
      throw err;
    }
    this.sweep(now);

    return {
      cooldownSeconds: RESEND_COOLDOWN_MS / 1000,
      expiresInSeconds: CODE_TTL_MS / 1000,
      // 仅在"模拟发送 + 非生产 + 显式开启 MEMBER_DEBUG_CODE=true"时回传，便于本地联调。
      // 默认关闭：避免有人忘记接入短信/邮件通道就上线，导致任何人都能拿到验证码、用任意手机号登录。
      ...(this.notify.isConsole(channel) && process.env.MEMBER_DEBUG_CODE === 'true' && process.env.NODE_ENV !== 'production'
        ? { debugCode: code }
        : {}),
    };
  }

  /** 校验并消耗验证码；失败抛 400 */
  verify(scene: CodeScene, target: string, code: string) {
    const key = `${scene}:${target}`;
    const entry = this.codes.get(key);
    if (!entry || entry.expireAt < Date.now()) {
      this.codes.delete(key);
      throw new BadRequestException('验证码不存在或已过期，请重新获取');
    }
    if (entry.attempts >= MAX_ATTEMPTS) {
      this.codes.delete(key);
      throw new BadRequestException('验证码错误次数过多，请重新获取');
    }
    const ok =
      entry.code.length === code.length &&
      crypto.timingSafeEqual(Buffer.from(entry.code), Buffer.from(code));
    if (!ok) {
      entry.attempts += 1;
      throw new BadRequestException('验证码错误');
    }
    this.codes.delete(key);
  }

  private sweep(now: number) {
    if (this.codes.size < 500) return;
    this.codes.forEach((v, k) => v.expireAt < now && this.codes.delete(k));
    this.lastSent.forEach((t, k) => now - t > RESEND_COOLDOWN_MS && this.lastSent.delete(k));
  }
}
