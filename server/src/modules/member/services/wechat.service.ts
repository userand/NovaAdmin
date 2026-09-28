import { BadRequestException, Injectable, Logger } from '@nestjs/common';

export type WechatPlatform = 'mp' | 'app' | 'h5';
export const WECHAT_PLATFORMS: WechatPlatform[] = ['mp', 'app', 'h5'];

export interface WechatIdentity {
  provider: string; // wechat_mp / wechat_app / wechat_h5
  openId: string;
  unionId?: string;
  nickname?: string;
  avatar?: string;
}

const ENV_KEYS: Record<WechatPlatform, { appId: string; secret: string }> = {
  mp: { appId: 'WECHAT_MP_APPID', secret: 'WECHAT_MP_SECRET' },
  app: { appId: 'WECHAT_APP_APPID', secret: 'WECHAT_APP_SECRET' },
  h5: { appId: 'WECHAT_H5_APPID', secret: 'WECHAT_H5_SECRET' },
};

/**
 * 微信授权：把前端拿到的 code 换成 openid/unionid。
 * - mp  小程序：wx.login() 的 code → jscode2session
 * - app 移动应用(开放平台)：SDK 授权返回的 code → sns/oauth2/access_token
 * - h5  公众号网页授权：回调的 code → sns/oauth2/access_token
 * 未配置 appid/secret 时：非生产且 WECHAT_MOCK=true 走模拟(openid=mock_<平台>_<code>)，否则拒绝。
 */
@Injectable()
export class WechatService {
  private readonly logger = new Logger('Wechat');

  configured(platform: WechatPlatform): boolean {
    const k = ENV_KEYS[platform];
    return !!(process.env[k.appId] && process.env[k.secret]);
  }

  get mockEnabled() {
    return process.env.WECHAT_MOCK === 'true' && process.env.NODE_ENV !== 'production';
  }

  async resolve(platform: WechatPlatform, code: string): Promise<WechatIdentity> {
    const provider = `wechat_${platform}`;
    if (!this.configured(platform)) {
      if (this.mockEnabled) return { provider, openId: `mock_${platform}_${code}` };
      throw new BadRequestException('该平台的微信登录尚未配置');
    }
    const k = ENV_KEYS[platform];
    const appid = process.env[k.appId]!;
    const secret = process.env[k.secret]!;

    if (platform === 'mp') {
      const data = await this.getJson<{ openid?: string; unionid?: string; errcode?: number; errmsg?: string }>(
        `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`,
      );
      if (!data.openid) this.fail(data.errcode, data.errmsg);
      return { provider, openId: data.openid!, unionId: data.unionid };
    }

    const token = await this.getJson<{ access_token?: string; openid?: string; unionid?: string; errcode?: number; errmsg?: string }>(
      `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appid}&secret=${secret}&code=${encodeURIComponent(code)}&grant_type=authorization_code`,
    );
    if (!token.openid) this.fail(token.errcode, token.errmsg);
    const identity: WechatIdentity = { provider, openId: token.openid!, unionId: token.unionid };
    // 尽力获取昵称头像(仅授权了 snsapi_userinfo 时有效)，失败忽略
    try {
      const info = await this.getJson<{ nickname?: string; headimgurl?: string; unionid?: string }>(
        `https://api.weixin.qq.com/sns/userinfo?access_token=${token.access_token}&openid=${token.openid}&lang=zh_CN`,
      );
      identity.nickname = info.nickname;
      identity.avatar = info.headimgurl;
      identity.unionId = identity.unionId || info.unionid;
    } catch { /* ignore */ }
    return identity;
  }

  private async getJson<T>(url: string): Promise<T> {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      return (await res.json()) as T;
    } catch (err) {
      // URL 里带 secret，日志只记录错误类型，绝不打印 URL
      this.logger.error(`微信接口请求失败: ${(err as Error).name}`);
      throw new BadRequestException('微信服务暂不可用，请稍后重试');
    }
  }

  private fail(errcode?: number, errmsg?: string): never {
    this.logger.warn(`微信授权失败 errcode=${errcode} errmsg=${errmsg}`);
    throw new BadRequestException(`微信授权失败${errcode ? `(${errcode})` : ''}，请重试`);
  }
}
