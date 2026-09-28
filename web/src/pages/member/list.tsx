import { useEffect, useState, type ReactNode } from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { Eye, KeyRound, LogOut, Pencil, Plus, RotateCcw, Search, Trash2, Unlink } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Textarea } from '@/ui/textarea';
import { Card } from '@/ui/card';
import { Badge } from '@/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { Can, PageHeader, Pager, StatusBadge } from '@/components/shared';
import { confirmDialog } from '@/components/ConfirmDialog';
import { memberApi, type MemberDetail, type MemberForm, type MemberItem, type MemberStats } from '@/api';

const SOURCE: Record<string, string> = { phone: '手机', email: '邮箱', wechat: '微信', admin: '后台' };
const WECHAT: Record<string, string> = { mp: '小程序', app: 'App', h5: '公众号' };
const METHOD: Record<string, string> = { phone_code: '手机验证码', email_code: '邮箱验证码', password: '密码', wechat: '微信' };
const PROVIDER: Record<string, string> = { wechat_mp: '微信小程序', wechat_app: '微信 App', wechat_h5: '微信公众号' };
const GENDER: Record<string, string> = { '0': '保密', '1': '男', '2': '女' };
const emptyForm: MemberForm = { nickname: '', phone: '', email: '', password: '', gender: '0', status: '0', remark: '' };

/** 头像：有图片地址就显示图片，否则显示昵称首字 */
function MemberAvatar({ m, className }: { m: { avatar?: string; nickname: string }; className?: string }) {
  return (
    <Avatar className={className}>
      {m.avatar && <AvatarImage src={m.avatar} alt="" />}
      <AvatarFallback>{m.nickname.slice(0, 1)}</AvatarFallback>
    </Avatar>
  );
}

export default function MemberListPage() {
  const [list, setList] = useState<MemberItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<MemberStats | null>(null);

  const [keyword, setKeyword] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);
  const [status, setStatus] = useState('all');
  const [source, setSource] = useState('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [pwdTarget, setPwdTarget] = useState<MemberItem | null>(null);
  const [newPwd, setNewPwd] = useState('');

  async function fetchList(p = page, size = pageSize) {
    setLoading(true);
    try {
      const { data: env } = await memberApi.page({
        page: p, pageSize: size,
        keyword: keyword || undefined,
        status: status === 'all' ? undefined : status,
        source: source === 'all' ? undefined : source,
      });
      setList(env.data.list);
      setTotal(env.data.total);
    } finally {
      setLoading(false);
    }
  }
  async function fetchStats() {
    const { data: env } = await memberApi.stats();
    setStats(env.data);
  }
  useEffect(() => { fetchList(); }, [page, pageSize, reloadKey]);
  useEffect(() => { fetchStats(); }, []);

  const refresh = () => { fetchList(); fetchStats(); };
  const search = () => { setPage(1); fetchList(1); };

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  async function openEdit(row: MemberItem) {
    const { data: env } = await memberApi.detail(row.id);
    const d = env.data;
    setEditingId(row.id);
    setForm({ nickname: d.nickname, phone: d.phone, email: d.email, gender: d.gender, status: d.status, remark: d.remark });
    setFormOpen(true);
  }

  async function submit() {
    if (!form.nickname.trim()) return toast.warning('请输入昵称');
    try {
      if (editingId) {
        await memberApi.update(editingId, { ...form, password: undefined });
        toast.success('修改成功');
      } else {
        await memberApi.create(form);
        toast.success('新增成功');
      }
      setFormOpen(false);
      refresh();
    } catch { /* 提示已由请求拦截器展示 */ }
  }

  async function openDetail(row: MemberItem) {
    const { data: env } = await memberApi.detail(row.id);
    setDetail(env.data);
  }

  async function handleDelete(row: MemberItem) {
    if (!(await confirmDialog({
      title: '删除会员',
      description: `确定要删除会员「${row.nickname}」吗？将释放其手机号、邮箱和微信绑定，并让登录立即失效。此操作不可恢复。`,
    }))) return;
    await memberApi.remove(row.id);
    toast.success('删除成功');
    refresh();
  }

  async function handleKick(row: MemberItem) {
    if (!(await confirmDialog({
      title: '强制下线',
      description: `「${row.nickname}」在所有设备上的登录会立即失效，需重新登录。`,
      confirmText: '强制下线',
    }))) return;
    await memberApi.kick(row.id);
    toast.success('已强制下线');
  }

  async function handleUnbind(identityId: number) {
    if (!detail) return;
    if (!(await confirmDialog({ title: '解绑微信', description: '解绑后该微信将无法再登录此会员账号。', confirmText: '确认解绑' }))) return;
    await memberApi.unbind(detail.id, identityId);
    toast.success('已解绑');
    const { data: env } = await memberApi.detail(detail.id);
    setDetail(env.data);
    fetchList();
  }

  async function submitPwd() {
    if (!pwdTarget) return;
    if (!/^(?=.*[a-zA-Z])(?=.*\d).{8,32}$/.test(newPwd)) return toast.warning('密码须为 8-32 位，且同时包含字母和数字');
    await memberApi.resetPassword(pwdTarget.id, newPwd);
    toast.success('密码已重置，该会员的登录已失效');
    setPwdTarget(null);
    setNewPwd('');
  }

  const cards = [
    { label: '会员总数', value: stats?.total, caption: `含停用 ${stats?.disabled ?? 0}` },
    { label: '今日新增', value: stats?.todayNew, caption: '今天注册的会员' },
    { label: '7 日活跃', value: stats?.active7d, caption: '近 7 天有登录' },
    { label: '绑定微信', value: stats?.wechatBound, caption: '至少绑定一个微信' },
  ];

  return (
    <div>
      <PageHeader
        title="会员管理"
        desc="移动端用户 · 支持手机号、邮箱、微信登录，与后台账号相互独立"
        action={
          <Can perm="member:create">
            <Button onClick={openCreate}><Plus /> 新增会员</Button>
          </Can>
        }
      />

      {/* 统计 */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="gap-0 px-5 py-4">
            <div className="text-muted-foreground text-[13px] font-medium">{c.label}</div>
            <div className="mt-1.5 text-2xl leading-none font-semibold tracking-tight tabular-nums">{c.value ?? '—'}</div>
            <div className="text-muted-foreground mt-2 text-xs">{c.caption}</div>
          </Card>
        ))}
      </div>

      <Card className="gap-0 py-4">
        <div className="flex flex-wrap items-center gap-3 px-4 pb-3">
          <Input
            value={keyword} onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="昵称 / 手机号 / 邮箱" className="w-60"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-32"><SelectValue placeholder="全部状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="0">正常</SelectItem>
              <SelectItem value="1">停用</SelectItem>
            </SelectContent>
          </Select>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-32"><SelectValue placeholder="全部来源" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部来源</SelectItem>
              {Object.entries(SOURCE).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={search}><Search /> 查询</Button>
          <Button
            variant="ghost"
            onClick={() => { setKeyword(''); setStatus('all'); setSource('all'); setPage(1); reload(); }}
          >
            <RotateCcw /> 重置
          </Button>
        </div>

        <div className="px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>会员</TableHead>
                <TableHead>手机号</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>微信</TableHead>
                <TableHead>来源</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>最近登录</TableHead>
                <TableHead>注册时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <MemberAvatar m={row} className="size-8" />
                      <div>
                        <div className="text-[13px] leading-tight font-medium">{row.nickname}</div>
                        <div className="text-muted-foreground font-mono text-[11px]">ID {row.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-[13px] tabular-nums">{row.hasPhone ? row.phone : <span className="text-muted-foreground">未绑定</span>}</TableCell>
                  <TableCell className="text-[13px]">{row.hasEmail ? row.email : <span className="text-muted-foreground">未绑定</span>}</TableCell>
                  <TableCell>
                    {row.wechat.length ? (
                      <div className="flex gap-1">
                        {row.wechat.map((w) => <Badge key={w} variant="success" className="text-[10.5px]">{WECHAT[w]}</Badge>)}
                      </div>
                    ) : <span className="text-muted-foreground text-[13px]">—</span>}
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10.5px]">{SOURCE[row.source] ?? row.source}</Badge></TableCell>
                  <TableCell><StatusBadge status={row.status} /></TableCell>
                  <TableCell className="text-muted-foreground text-xs tabular-nums">
                    {row.lastLoginAt ? dayjs(row.lastLoginAt).format('MM-DD HH:mm') : '从未登录'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs tabular-nums">{dayjs(row.createdAt).format('YYYY-MM-DD')}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="size-7" title="详情" onClick={() => openDetail(row)}><Eye className="size-3.5" /></Button>
                      <Can perm="member:update">
                        <Button variant="ghost" size="icon" className="size-7" title="编辑" onClick={() => openEdit(row)}><Pencil className="size-3.5" /></Button>
                      </Can>
                      <Can perm="member:resetPwd">
                        <Button variant="ghost" size="icon" className="size-7" title="重置密码" onClick={() => setPwdTarget(row)}><KeyRound className="size-3.5" /></Button>
                      </Can>
                      <Can perm="member:update">
                        <Button variant="ghost" size="icon" className="size-7" title="强制下线" onClick={() => handleKick(row)}><LogOut className="size-3.5" /></Button>
                      </Can>
                      <Can perm="member:delete">
                        <Button variant="ghost" size="icon" className="text-destructive size-7" title="删除" onClick={() => handleDelete(row)}><Trash2 className="size-3.5" /></Button>
                      </Can>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && list.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-muted-foreground py-12 text-center text-sm">暂无会员</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1); }} />
        </div>
      </Card>

      {/* 新增 / 编辑 */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑会员' : '新增会员'}</DialogTitle>
            <DialogDescription>手机号与邮箱均可选，至少填写一项便于会员登录；留空则清除。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Row label="昵称"><Input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} maxLength={32} /></Row>
            <Row label="手机号"><Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="选填，11 位手机号" /></Row>
            <Row label="邮箱"><Input value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="选填" /></Row>
            {!editingId && (
              <Row label="初始密码">
                <Input type="password" value={form.password ?? ''} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="选填，留空则会员用验证码登录" />
              </Row>
            )}
            <Row label="性别">
              <Select value={form.gender ?? '0'} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(GENDER).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Row>
            <Row label="状态">
              <Select value={form.status ?? '0'} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="0">正常</SelectItem><SelectItem value="1">停用(立即下线)</SelectItem></SelectContent>
              </Select>
            </Row>
            <Row label="备注"><Textarea rows={2} value={form.remark ?? ''} onChange={(e) => setForm({ ...form, remark: e.target.value })} placeholder="仅后台可见" /></Row>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button>
            <Button onClick={submit}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重置密码 */}
      <Dialog open={!!pwdTarget} onOpenChange={(v) => { if (!v) { setPwdTarget(null); setNewPwd(''); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>重置密码 · {pwdTarget?.nickname}</DialogTitle>
            <DialogDescription>8-32 位，须包含字母和数字。重置后该会员所有设备的登录会失效。</DialogDescription>
          </DialogHeader>
          <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="新密码" />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPwdTarget(null); setNewPwd(''); }}>取消</Button>
            <Button onClick={submitPwd}>确认重置</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 详情 */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>会员详情</DialogTitle>
            <DialogDescription>完整联系方式仅在此处展示，请注意保护隐私。</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <MemberAvatar m={detail} className="size-12" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold">{detail.nickname}</span>
                    <StatusBadge status={detail.status} />
                  </div>
                  <div className="text-muted-foreground font-mono text-xs">ID {detail.id} · {SOURCE[detail.source] ?? detail.source}注册</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
                <Kv k="手机号" v={detail.phone || '未绑定'} />
                <Kv k="邮箱" v={detail.email || '未绑定'} />
                <Kv k="性别" v={GENDER[detail.gender]} />
                <Kv k="生日" v={detail.birthday ? dayjs(detail.birthday).format('YYYY-MM-DD') : '—'} />
                <Kv k="登录密码" v={detail.hasPassword ? '已设置' : '未设置(仅验证码/微信登录)'} />
                <Kv k="登录次数" v={String(detail.loginCount)} />
                <Kv k="最近登录" v={detail.lastLoginAt ? `${dayjs(detail.lastLoginAt).format('YYYY-MM-DD HH:mm')} · ${detail.lastLoginIp}` : '从未登录'} />
                <Kv k="注册时间" v={dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm')} />
                {detail.remark && <div className="col-span-2"><Kv k="备注" v={detail.remark} /></div>}
              </div>

              <div>
                <div className="mb-2 text-[13px] font-medium">第三方绑定</div>
                {detail.identities.length === 0 ? (
                  <div className="text-muted-foreground text-xs">未绑定微信</div>
                ) : (
                  <div className="space-y-1.5">
                    {detail.identities.map((i) => (
                      <div key={i.id} className="bg-muted/50 flex items-center gap-3 rounded-md px-3 py-2 text-xs">
                        <Badge variant="success" className="text-[10.5px]">{PROVIDER[i.provider] ?? i.provider}</Badge>
                        <span className="text-muted-foreground font-mono">{i.openId}</span>
                        <span className="text-muted-foreground ml-auto">{dayjs(i.createdAt).format('YYYY-MM-DD')}</span>
                        <Can perm="member:update">
                          <Button variant="ghost" size="icon" className="text-destructive size-6" title="解绑" onClick={() => handleUnbind(i.id)}><Unlink className="size-3" /></Button>
                        </Can>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 text-[13px] font-medium">最近登录</div>
                {detail.recentLogins.length === 0 ? (
                  <div className="text-muted-foreground text-xs">暂无记录</div>
                ) : (
                  <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                    {detail.recentLogins.map((l) => (
                      <div key={l.id} className="flex items-center gap-3 text-xs">
                        <Badge variant={l.status === '0' ? 'success' : 'destructive'} className="text-[10.5px]">{l.status === '0' ? '成功' : '失败'}</Badge>
                        <span>{METHOD[l.method] ?? l.method}</span>
                        <span className="text-muted-foreground">{l.client || '—'} · {l.os}</span>
                        <span className="text-muted-foreground ml-auto tabular-nums">{dayjs(l.login_time).format('MM-DD HH:mm')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[84px_1fr] items-center gap-3">
      <Label className="text-[13px]">{label}</Label>
      {children}
    </div>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <div className="text-muted-foreground text-xs">{k}</div>
      <div className="mt-0.5 break-all">{v}</div>
    </div>
  );
}
