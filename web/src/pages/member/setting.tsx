import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Mail, MessageCircle, Smartphone, KeyRound, UserPlus } from 'lucide-react';
import { Badge } from '@/ui/badge';
import { Card } from '@/ui/card';
import { Switch } from '@/ui/switch';
import { PageHeader } from '@/components/shared';
import { useAuthStore } from '@/stores/auth';
import { memberApi, type MemberSettings } from '@/api';

type SwitchKey = keyof MemberSettings['switches'];

const ENDPOINTS: [string, string, string][] = [
  ['GET', '/api/app/auth/config', '登录页配置：当前开放的登录方式'],
  ['POST', '/api/app/auth/code/send', '发送验证码(手机短信 / 邮件)'],
  ['POST', '/api/app/auth/login/phone', '手机号 + 验证码登录，未注册自动注册'],
  ['POST', '/api/app/auth/login/email', '邮箱 + 验证码登录，未注册自动注册'],
  ['POST', '/api/app/auth/login/password', '手机号 / 邮箱 + 密码登录'],
  ['POST', '/api/app/auth/login/wechat', '微信登录(mp 小程序 / app 移动应用 / h5 公众号)'],
  ['POST', '/api/app/auth/refresh', '刷新令牌'],
  ['POST', '/api/app/auth/password/reset', '找回密码'],
  ['GET', '/api/app/me', '我的资料(需会员令牌)'],
  ['PUT', '/api/app/me', '修改资料 / 头像 / 密码，绑定与解绑手机、邮箱、微信'],
];

export default function MemberSettingPage() {
  const [data, setData] = useState<MemberSettings | null>(null);
  const [saving, setSaving] = useState<SwitchKey | null>(null);
  const canEdit = useAuthStore((s) => s.hasPermission('member:setting:update'));

  useEffect(() => {
    memberApi.settings().then(({ data: env }) => setData(env.data));
  }, []);

  async function toggle(key: SwitchKey, value: boolean) {
    if (!data) return;
    const prev = data;
    setData({ ...data, switches: { ...data.switches, [key]: value } }); // 乐观更新
    setSaving(key);
    try {
      const { data: env } = await memberApi.saveSettings({ [key]: value });
      setData(env.data);
      toast.success(value ? '已开启' : '已关闭');
    } catch {
      setData(prev); // 失败(如"至少保留一种登录方式")回滚，提示已由拦截器展示
    } finally {
      setSaving(null);
    }
  }

  const sw = data?.switches;
  const wx = data?.providers.wechat;
  const wxPlatforms: [string, string][] = [['mp', '小程序'], ['app', '移动应用'], ['h5', '公众号']];

  return (
    <div>
      <PageHeader title="登录方式" desc="控制移动端开放哪些登录方式；修改后立即生效" />

      <div className="grid gap-4 md:grid-cols-2">
        <MethodCard
          icon={<Smartphone className="size-4" />} title="手机验证码登录" desc="手机号 + 短信验证码，未注册自动注册"
          checked={sw?.phone} disabled={!canEdit || !data || saving === 'phone'} onChange={(v) => toggle('phone', v)}
          status={data && (data.providers.sms.configured
            ? <Badge variant="success">已接入 · {data.providers.sms.provider === 'aliyun' ? '阿里云短信' : data.providers.sms.provider}</Badge>
            : <Badge variant="warning">模拟模式 · 验证码仅写入服务端日志</Badge>)}
        />
        <MethodCard
          icon={<Mail className="size-4" />} title="邮箱验证码登录" desc="邮箱 + 邮件验证码，未注册自动注册"
          checked={sw?.email} disabled={!canEdit || !data || saving === 'email'} onChange={(v) => toggle('email', v)}
          status={data && (data.providers.email.configured
            ? <Badge variant="success">已接入 SMTP</Badge>
            : <Badge variant="warning">模拟模式 · 验证码仅写入服务端日志</Badge>)}
        />
        <MethodCard
          icon={<KeyRound className="size-4" />} title="账号密码登录" desc="手机号或邮箱 + 密码，连续 5 次失败锁定 10 分钟"
          checked={sw?.password} disabled={!canEdit || !data || saving === 'password'} onChange={(v) => toggle('password', v)}
        />
        <MethodCard
          icon={<MessageCircle className="size-4" />} title="微信登录" desc="小程序 / 移动应用 / 公众号网页授权，首次登录自动注册"
          checked={sw?.wechat} disabled={!canEdit || !data || saving === 'wechat'} onChange={(v) => toggle('wechat', v)}
          status={wx && (
            <div className="flex flex-wrap items-center gap-1.5">
              {wxPlatforms.map(([k, label]) => (
                <Badge key={k} variant={wx.platforms[k as 'mp' | 'app' | 'h5'] ? 'success' : 'secondary'}>
                  {label}{wx.platforms[k as 'mp' | 'app' | 'h5'] ? ' 已配置' : ' 未配置'}
                </Badge>
              ))}
              {wx.mock && <Badge variant="warning">开发模拟登录已启用</Badge>}
            </div>
          )}
        />
        <div className="md:col-span-2">
          <MethodCard
            icon={<UserPlus className="size-4" />} title="允许自助注册" desc="关闭后，验证码 / 微信首次登录不再自动创建会员，仅已有会员可登录"
            checked={sw?.register} disabled={!canEdit || !data || saving === 'register'} onChange={(v) => toggle('register', v)}
          />
        </div>
      </div>

      {!canEdit && <p className="text-muted-foreground mt-3 text-xs">当前账号没有修改权限，仅可查看。</p>}

      <Card className="mt-6 gap-0 py-5">
        <div className="px-5 pb-3">
          <h3 className="text-sm font-semibold">移动端接口</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            会员令牌与后台令牌互不通用。客户端请求头建议带 <code className="bg-muted rounded px-1 font-mono">X-Client: ios | android | mp | h5</code>，用于登录日志。
            完整参数与示例见 <a className="underline underline-offset-2" href="/api/docs" target="_blank" rel="noreferrer">Swagger 文档 → 移动端</a>。
          </p>
        </div>
        <div className="divide-y px-5">
          {ENDPOINTS.map(([method, path, desc]) => (
            <div key={path + method} className="flex items-center gap-3 py-2 text-[13px]">
              <span className={`w-12 shrink-0 font-mono text-[11px] font-semibold ${method === 'GET' ? 'text-blue-600' : method === 'POST' ? 'text-emerald-600' : 'text-amber-600'}`}>{method}</span>
              <code className="font-mono text-xs">{path}</code>
              <span className="text-muted-foreground ml-auto text-xs">{desc}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MethodCard({
  icon, title, desc, checked, disabled, onChange, status,
}: {
  icon: ReactNode; title: string; desc: string; checked?: boolean; disabled?: boolean;
  onChange: (v: boolean) => void; status?: ReactNode;
}) {
  return (
    <Card className={`gap-3 px-5 py-5 transition-opacity ${checked === false ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-3">
        <span className="bg-muted text-foreground grid size-9 shrink-0 place-items-center rounded-lg">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{desc}</div>
        </div>
        <Switch checked={!!checked} disabled={disabled} onCheckedChange={onChange} />
      </div>
      {status && <div className="pl-12">{status}</div>}
    </Card>
  );
}
