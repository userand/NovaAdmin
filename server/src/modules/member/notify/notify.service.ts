import { BadGatewayException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';

export type CodeChannel = 'phone' | 'email';
export type CodeScene = 'login' | 'bind' | 'reset';

const SCENE_LABEL: Record<CodeScene, string> = { login: '登录', bind: '绑定', reset: '重置密码' };

/** 阿里云 RPC 签名要求的百分号编码 */
const pct = (v: string) =>
  encodeURIComponent(v).replace(/\+/g, '%20').replace(/\*/g, '%2A').replace(/%7E/g, '~');

/**
 * 验证码下发：
 * - 短信：SMS_PROVIDER=console(默认，仅写日志) | aliyun
 * - 邮件：配置了 MAIL_HOST 走 SMTP，否则写日志
 * console 模式下接口会在非生产环境回传 debugCode，便于本地联调；生产必须设置 NODE_ENV=production。
 */
@Injectable()
export class NotifyService implements OnModuleInit {
  private readonly logger = new Logger('Notify');
  private mailer: nodemailer.Transporter | null = null;

  onModuleInit() {
    if (process.env.NODE_ENV === 'production') {
      if (!this.smsConfigured) this.logger.warn('生产环境未配置短信通道：手机验证码不会真实下发，请配置 SMS_PROVIDER 及对应密钥');
      if (!this.mailConfigured) this.logger.warn('生产环境未配置邮件通道：邮箱验证码不会真实下发，请配置 MAIL_HOST 等 SMTP 参数');
    }
  }

  smsProvider(): 'console' | 'aliyun' {
    return (process.env.SMS_PROVIDER || 'console').toLowerCase() === 'aliyun' ? 'aliyun' : 'console';
  }

  get smsConfigured() {
    return this.smsProvider() === 'aliyun'
      && !!(process.env.ALIYUN_SMS_KEY_ID && process.env.ALIYUN_SMS_KEY_SECRET && process.env.ALIYUN_SMS_SIGN_NAME && process.env.ALIYUN_SMS_TEMPLATE_CODE);
  }

  get mailConfigured() {
    return !!process.env.MAIL_HOST;
  }

  /** 该通道当前是否为"仅写日志"的模拟模式 */
  isConsole(channel: CodeChannel): boolean {
    return channel === 'phone' ? !this.smsConfigured : !this.mailConfigured;
  }

  async sendCode(channel: CodeChannel, target: string, code: string, scene: CodeScene): Promise<void> {
    if (this.isConsole(channel)) {
      this.logger.warn(`[模拟发送] ${channel === 'phone' ? '短信' : '邮件'} → ${target}  ${SCENE_LABEL[scene]}验证码 ${code}`);
      return;
    }
    try {
      if (channel === 'phone') await this.sendAliyunSms(target, code);
      else await this.sendMail(target, code, scene);
    } catch (err) {
      // 详细原因只写日志，不回给客户端
      this.logger.error(`验证码下发失败(${channel}): ${(err as Error).message}`);
      throw new BadGatewayException('验证码发送失败，请稍后重试');
    }
  }

  private async sendMail(to: string, code: string, scene: CodeScene) {
    if (!this.mailer) {
      this.mailer = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT || 465),
        secure: (process.env.MAIL_SECURE ?? 'true') !== 'false',
        auth: process.env.MAIL_USER ? { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS } : undefined,
      });
    }
    const label = SCENE_LABEL[scene];
    await this.mailer.sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to,
      subject: `【Nova】${label}验证码`,
      text: `您的${label}验证码是 ${code}，5 分钟内有效。如非本人操作请忽略。`,
      html: `<div style="font-family:sans-serif;line-height:1.7"><p>您正在进行<b>${label}</b>操作，验证码：</p><p style="font-size:28px;letter-spacing:6px;font-weight:700">${code}</p><p style="color:#888">5 分钟内有效，请勿泄露给他人。如非本人操作请忽略。</p></div>`,
    });
  }

  /** 阿里云短信(Dysmsapi 2017-05-25，RPC 签名 V1)。注意：此实现未经真实账号联调验证。 */
  private async sendAliyunSms(phone: string, code: string) {
    const params: Record<string, string> = {
      AccessKeyId: process.env.ALIYUN_SMS_KEY_ID!,
      Action: 'SendSms',
      Format: 'JSON',
      PhoneNumbers: phone,
      RegionId: 'cn-hangzhou',
      SignName: process.env.ALIYUN_SMS_SIGN_NAME!,
      SignatureMethod: 'HMAC-SHA1',
      SignatureNonce: crypto.randomUUID(),
      SignatureVersion: '1.0',
      TemplateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE!,
      TemplateParam: JSON.stringify({ code }),
      Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      Version: '2017-05-25',
    };
    const canonical = Object.keys(params).sort().map((k) => `${pct(k)}=${pct(params[k])}`).join('&');
    const signature = crypto
      .createHmac('sha1', `${process.env.ALIYUN_SMS_KEY_SECRET}&`)
      .update(`GET&${pct('/')}&${pct(canonical)}`)
      .digest('base64');
    const res = await fetch(`https://dysmsapi.aliyuncs.com/?Signature=${pct(signature)}&${canonical}`, {
      signal: AbortSignal.timeout(8000),
    });
    const body = (await res.json()) as { Code?: string; Message?: string };
    if (body.Code !== 'OK') throw new Error(`aliyun sms ${body.Code}: ${body.Message}`);
  }
}
