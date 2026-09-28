import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { authApi } from '@/api';
import { useAuthStore } from '@/stores/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const login = useAuthStore((s) => s.login);

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
  const [captchaCode, setCaptchaCode] = useState('');
  const [captcha, setCaptcha] = useState<{ captchaId: string; image: string }>({ captchaId: '', image: '' });
  const [loading, setLoading] = useState(false);

  async function refreshCaptcha() {
    const { data: env } = await authApi.getCaptcha();
    setCaptcha(env.data);
    setCaptchaCode('');
  }

  useEffect(() => {
    refreshCaptcha();
  }, []);

  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault();
    if (!username || !password || !captchaCode) {
      toast.warning('请填写完整登录信息');
      return;
    }
    setLoading(true);
    try {
      await login({ username, password, captchaId: captcha.captchaId, captchaCode });
      toast.success('登录成功');
      navigate(params.get('redirect') || '/', { replace: true });
    } catch {
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  }

  function fill(u: string) {
    setUsername(u);
    setPassword('Admin@123');
  }

  return (
    <div className="flex min-h-screen">
      {/* 品牌面板 */}
      <aside className="relative hidden w-[44%] max-w-2xl flex-col overflow-hidden bg-zinc-950 p-12 text-zinc-50 lg:flex">
        {/* 极淡的点阵 + 顶部柔光，只增加层次，不改变黑白灰的基调 */}
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage: 'radial-gradient(oklch(1 0 0 / 9%) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 30% 25%, #000 25%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 30% 25%, #000 25%, transparent 75%)',
          }}
        />
        <div className="pointer-events-none absolute -top-40 -left-32 size-[420px] rounded-full bg-white/[0.06] blur-[100px]" />

        <div className="relative grid size-10 place-items-center rounded-lg bg-zinc-50 text-xl font-bold text-zinc-950">N</div>
        <div className="relative mt-auto">
          <h1 className="text-3xl font-bold tracking-tight">Nova Admin</h1>
          <p className="mt-2 text-sm text-zinc-400">商业级中后台基础框架</p>
          <ul className="mt-10 space-y-3 text-[13.5px] text-zinc-300">
            <li className="before:mr-3 before:inline-block before:size-1.5 before:rounded-sm before:bg-zinc-700 before:content-['']">NestJS · React · TypeScript · MySQL</li>
            <li className="before:mr-3 before:inline-block before:size-1.5 before:rounded-sm before:bg-zinc-700 before:content-['']">JWT 双令牌认证 + 接口级 RBAC 权限</li>
            <li className="before:mr-3 before:inline-block before:size-1.5 before:rounded-sm before:bg-zinc-700 before:content-['']">用户 / 角色 / 菜单 / 部门 / 数据权限</li>
            <li className="before:mr-3 before:inline-block before:size-1.5 before:rounded-sm before:bg-zinc-700 before:content-['']">登录审计 · 操作审计 · 字典配置</li>
          </ul>
          <div className="mt-14 flex gap-10">
            {([['12+', '业务模块'], ['60+', 'REST API'], ['100%', 'TypeScript']] as [string, string][]).map(([v, l]) => (
              <div key={l}>
                <div className="text-2xl font-bold tabular-nums">{v}</div>
                <div className="mt-0.5 text-xs text-zinc-500">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* 表单 */}
      <main className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-[368px] animate-[enter_.2s_ease-out]">
          <h2 className="text-2xl font-bold tracking-tight">登录</h2>
          <p className="text-muted-foreground mt-2 text-sm">输入账号密码访问管理后台</p>

          <form className="mt-8 space-y-4" onSubmit={handleLogin}>
            <Field label="账号">
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" autoComplete="username" />
            </Field>
            <Field label="密码">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Field>
            <Field label="验证码">
              <div className="flex gap-2">
                <Input
                  value={captchaCode}
                  onChange={(e) => setCaptchaCode(e.target.value.replace(/\s/g, '').toLowerCase())}
                  placeholder="不区分大小写"
                  maxLength={4}
                />
                <button
                  type="button"
                  onClick={refreshCaptcha}
                  title="看不清？点击刷新"
                  className="border-input bg-card hover:border-muted-foreground grid h-9 w-28 shrink-0 place-items-center overflow-hidden rounded-md border transition-colors"
                >
                  {captcha.image ? (
                    <img src={captcha.image} alt="验证码" className="h-full w-full object-contain" draggable={false} />
                  ) : (
                    <span className="text-muted-foreground text-xs">加载中</span>
                  )}
                </button>
              </div>
            </Field>

            <Button type="submit" className="h-10 w-full" disabled={loading}>
              {loading ? '正在进入…' : '登录'}
            </Button>
          </form>

          <div className="mt-8 border-t pt-5">
            <div className="text-muted-foreground mb-2.5 text-xs">演示账号</div>
            <div className="flex flex-wrap gap-2">
              {([['admin', '超级管理员'], ['tangxin', '运营专员'], ['audit01', '只读访客']] as [string, string][]).map(([u, role]) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => fill(u)}
                  className="hover:bg-accent hover:text-accent-foreground flex h-8 items-center gap-2 rounded-md border px-2.5 text-xs transition-colors"
                >
                  <span className="font-medium">{u}</span>
                  <span className="text-muted-foreground">{role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-muted-foreground mt-10 text-xs">© 2026 Nova Admin</p>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
