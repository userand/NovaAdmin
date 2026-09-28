import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Textarea } from '@/ui/textarea';
import { Badge } from '@/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/ui/card';
import { Avatar, AvatarFallback } from '@/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs';
import { Separator } from '@/ui/separator';
import { authApi, type ProfileInfo } from '@/api';
import { useAuthStore } from '@/stores/auth';
import dayjs from 'dayjs';

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [info, setInfo] = useState({ nickname: '', signature: '', email: '', phone: '', gender: '0' });
  const [pwd, setPwd] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const refreshUser = useAuthStore((s) => s.fetchRoutes);

  useEffect(() => {
    authApi.getProfile().then(({ data: env }) => {
      setProfile(env.data);
      const p = env.data;
      setInfo({ nickname: p.nickname, signature: p.signature, email: p.email, phone: p.phone, gender: p.gender });
    });
  }, []);

  async function saveInfo() {
    if (!info.nickname) return toast.warning('昵称不能为空');
    const { data: env } = await authApi.updateProfile(info);
    setProfile(env.data);
    toast.success('资料已更新');
  }

  async function savePwd() {
    if (!pwd.oldPassword || !pwd.newPassword) return toast.warning('请填写完整');
    if (pwd.newPassword !== pwd.confirm) return toast.warning('两次输入的密码不一致');
    if (!/^(?=.*[a-zA-Z])(?=.*\d).{8,32}$/.test(pwd.newPassword)) return toast.warning('密码须 8-32 位且包含字母和数字');
    await authApi.changePassword({ oldPassword: pwd.oldPassword, newPassword: pwd.newPassword });
    toast.success('密码修改成功');
    setPwd({ oldPassword: '', newPassword: '', confirm: '' });
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight">个人中心</h1>
        <p className="text-muted-foreground mt-1 text-[13px]">维护个人资料与账号安全</p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[320px_1fr]">
        {/* 资料卡 */}
        <Card>
          <CardContent className="flex flex-col items-center text-center">
            <Avatar className="size-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                {(profile?.nickname || 'A').slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <h3 className="mt-3 text-[16px] font-semibold">{profile?.nickname}</h3>
            <p className="text-muted-foreground text-xs">@{profile?.username}</p>
            {profile?.signature && (
              <p className="text-muted-foreground mt-2.5 text-xs italic">「{profile.signature}」</p>
            )}
            <Separator className="my-4" />
            <div className="w-full space-y-2.5 text-left text-[13px]">
              <Kv k="部门" v={profile?.deptName || '未分配'} />
              <Kv k="角色" v={profile?.roles.map((r) => r.name).join('、') || '未分配'} />
              <Kv k="登录次数" v={`${profile?.loginCount ?? 0} 次`} />
              <Kv k="最后登录" v={profile?.lastLoginAt ? dayjs(profile.lastLoginAt).format('YYYY-MM-DD HH:mm') : '—'} />
              <Kv k="加入时间" v={profile?.createdAt ? dayjs(profile.createdAt).format('YYYY-MM-DD') : '—'} />
            </div>
          </CardContent>
        </Card>

        {/* 编辑区 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">账户设置</CardTitle>
            <CardDescription>修改基本资料或密码</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="info">
              <TabsList className="mb-4">
                <TabsTrigger value="info">基本资料</TabsTrigger>
                <TabsTrigger value="password">修改密码</TabsTrigger>
              </TabsList>

              <TabsContent value="info">
                <div className="max-w-md space-y-4">
                  <Row label="昵称"><Input value={info.nickname} onChange={(e) => setInfo({ ...info, nickname: e.target.value })} /></Row>
                  <Row label="手机号"><Input value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} /></Row>
                  <Row label="邮箱"><Input value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} /></Row>
                  <Row label="性别">
                    <div className="flex gap-1.5">
                      {([['0', '保密'], ['1', '男'], ['2', '女']] as [string, string][]).map(([v, l]) => (
                        <button key={v} type="button" onClick={() => setInfo({ ...info, gender: v })}
                          className={`h-8 rounded-md border px-3 text-xs transition-colors ${info.gender === v ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </Row>
                  <Row label="签名">
                    <Textarea rows={2} maxLength={100} value={info.signature} onChange={(e) => setInfo({ ...info, signature: e.target.value })} placeholder="一句话介绍自己" />
                  </Row>
                  <Button onClick={saveInfo}>保存修改</Button>
                </div>
              </TabsContent>

              <TabsContent value="password">
                <div className="max-w-md space-y-4">
                  <Row label="旧密码"><Input type="password" value={pwd.oldPassword} onChange={(e) => setPwd({ ...pwd, oldPassword: e.target.value })} /></Row>
                  <Row label="新密码"><Input type="password" value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} placeholder="8-32 位，含字母和数字" /></Row>
                  <Row label="确认密码"><Input type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} /></Row>
                  <Button onClick={savePwd}>确认修改</Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      {void refreshUser}
      {void Badge}
    </div>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="truncate font-medium">{v}</span>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[84px_1fr] items-center gap-3">
      <Label className="text-[13px]">{label}</Label>
      {children}
    </div>
  );
}
