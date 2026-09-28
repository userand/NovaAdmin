import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type LoginMethod = 'phone' | 'email' | 'password' | 'wechat';

/** 开关与 sys_config 中的键名一一对应，可在"会员中心 → 登录方式"页面修改 */
export const SETTING_KEYS = {
  register: 'member.register.enabled',
  phone: 'member.login.phone',
  email: 'member.login.email',
  password: 'member.login.password',
  wechat: 'member.login.wechat',
} as const;
export type SettingName = keyof typeof SETTING_KEYS;

const CACHE_TTL_MS = 15 * 1000;

@Injectable()
export class MemberSettingsService {
  private cache: { at: number; values: Record<SettingName, boolean> } | null = null;

  constructor(private readonly dataSource: DataSource) {}

  /** 读取全部开关；缺省(没有对应配置行)一律视为开启 */
  async all(): Promise<Record<SettingName, boolean>> {
    if (this.cache && Date.now() - this.cache.at < CACHE_TTL_MS) return this.cache.values;
    const rows: { key: string; value: string }[] = await this.dataSource.query(
      `SELECT \`key\`, value FROM sys_config WHERE \`key\` LIKE 'member.%' AND deleted IS NULL`,
    );
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const values = Object.fromEntries(
      (Object.keys(SETTING_KEYS) as SettingName[]).map((name) => [name, map.get(SETTING_KEYS[name]) !== 'false']),
    ) as Record<SettingName, boolean>;
    this.cache = { at: Date.now(), values };
    return values;
  }

  async assertLoginEnabled(method: LoginMethod) {
    const labels: Record<LoginMethod, string> = { phone: '手机验证码', email: '邮箱验证码', password: '账号密码', wechat: '微信' };
    if (!(await this.all())[method]) throw new ForbiddenException(`${labels[method]}登录已关闭，请使用其他方式`);
  }

  async registerEnabled() {
    return (await this.all()).register;
  }

  async update(patch: Partial<Record<SettingName, boolean>>) {
    for (const [name, enabled] of Object.entries(patch) as [SettingName, boolean][]) {
      if (!(name in SETTING_KEYS) || typeof enabled !== 'boolean') continue;
      await this.dataSource.query(
        `UPDATE sys_config SET value = ? WHERE \`key\` = ? AND deleted IS NULL`,
        [String(enabled), SETTING_KEYS[name]],
      );
    }
    this.cache = null;
    return this.all();
  }

  invalidate() {
    this.cache = null;
  }
}
