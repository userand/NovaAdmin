import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { KeyRound, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Badge } from '@/ui/badge';
import { Avatar, AvatarFallback } from '@/ui/avatar';
import { Card } from '@/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/ui/table';
import { PageHeader, Pager, StatusBadge, Can } from '@/components/shared';
import { userApi, deptApi, roleApi, type SystemUser, type UserForm, type DeptTreeNode } from '@/api';
import { useAuthStore } from '@/stores/auth';
import dayjs from 'dayjs';
import { confirmDialog } from '@/components/ConfirmDialog';

export default function UserPage() {
  const [list, setList] = useState<SystemUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);
  const [status, setStatus] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  const [deptTree, setDeptTree] = useState<DeptTreeNode[]>([]);
  const [deptId, setDeptId] = useState<number | null>(null);
  const [roleOptions, setRoleOptions] = useState<{ id: number; name: string; code: string }[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SystemUser | null>(null);
  const [form, setForm] = useState<UserForm>({ nickname: '', username: '', gender: '0', deptId: null, roleIds: [], status: '0' });
  const [resetTarget, setResetTarget] = useState<SystemUser | null>(null);
  const [newPwd, setNewPwd] = useState('');

  const isSuperAdmin = useAuthStore((s) => !!s.userInfo?.isSuperAdmin);

  async function fetchList() {
    setLoading(true);
    try {
      const { data: env } = await userApi.page({
        page, pageSize,
        keyword: keyword || undefined,
        status: status === 'all' ? undefined : status,
        deptId: deptId ?? undefined,
      });
      setList(env.data.list);
      setTotal(env.data.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
  }, [page, pageSize, deptId, reloadKey]);

  useEffect(() => {
    deptApi.tree().then(({ data }) => setDeptTree(data.data));
    roleApi.options().then(({ data }) => setRoleOptions(data.data));
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ nickname: '', username: '', gender: '0', deptId: null, roleIds: [], status: '0' });
    setDialogOpen(true);
  }

  async function openEdit(row: SystemUser) {
    setEditing(row);
    const { data: env } = await userApi.detail(row.id);
    setForm(env.data);
    setDialogOpen(true);
  }

  async function submit() {
    if (!form.nickname) return toast.warning('请填写昵称');
    try {
      if (editing) {
        await userApi.update(editing.id, form);
        toast.success('修改成功');
      } else {
        await userApi.create(form);
        toast.success('新增成功');
      }
      setDialogOpen(false);
      fetchList();
    } catch { /* toast 已由拦截器处理 */ }
  }

  async function handleDelete(row: SystemUser) {
    if (!(await confirmDialog({ title: '删除用户', description: `确定要删除用户「${row.nickname}」吗？此操作不可恢复。` }))) return;
    await userApi.remove(row.id);
    toast.success('删除成功');
    fetchList();
  }

  async function submitReset() {
    if (!resetTarget) return;
    if (!/^(?=.*[a-zA-Z])(?=.*\d).{8,32}$/.test(newPwd)) return toast.warning('密码须 8-32 位且包含字母和数字');
    await userApi.resetPassword(resetTarget.id, newPwd);
    toast.success('密码已重置');
    setResetTarget(null);
    setNewPwd('');
  }

  // 部门树(扁平化展示为带缩进的可点击列表)
  const flatDepts: { node: DeptTreeNode; depth: number }[] = [];
  const walkDept = (nodes: DeptTreeNode[], depth: number) => {
    nodes.forEach((n) => {
      flatDepts.push({ node: n, depth });
      if (n.children?.length) walkDept(n.children, depth + 1);
    });
  };
  walkDept(deptTree, 0);

  return (
    <div>
      <PageHeader title="用户管理" desc="系统用户的账号、角色与状态管理" action={
        <Can perm="system:user:create">
          <Button onClick={openCreate}><Plus /> 新增用户</Button>
        </Can>
      } />

      <div className="flex gap-4">
        {/* 部门面板 */}
        <Card className="hidden w-56 shrink-0 py-4 lg:block">
          <div className="px-4 pb-2 text-[13px] font-medium">所属部门</div>
          <div className="max-h-[560px] overflow-y-auto px-2">
            <button
              type="button"
              onClick={() => setDeptId(null)}
              className={`hover:bg-accent w-full rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${deptId === null ? 'bg-accent font-medium' : 'text-muted-foreground'}`}
            >
              全部部门
            </button>
            {flatDepts.map(({ node, depth }) => (
              <button
                key={node.id}
                type="button"
                onClick={() => setDeptId(deptId === node.id ? null : node.id)}
                style={{ paddingLeft: 10 + depth * 16 }}
                className={`hover:bg-accent w-full rounded-md py-1.5 pr-2.5 text-left text-[13px] transition-colors ${deptId === node.id ? 'bg-accent font-medium' : 'text-muted-foreground'}`}
              >
                {node.name}
              </button>
            ))}
          </div>
        </Card>

        <div className="min-w-0 flex-1 space-y-4">
          {/* 搜索 */}
          <Card className="gap-0 py-4">
            <div className="flex flex-wrap items-center gap-3 px-4">
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (setPage(1), reload())}
                placeholder="账号 / 昵称 / 手机号"
                className="w-60"
              />
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); reload(); }}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="0">正常</SelectItem>
                  <SelectItem value="1">停用</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => { setPage(1); reload(); }}>
                <Search /> 查询
              </Button>
              <Button variant="ghost" onClick={() => { setKeyword(''); setStatus('all'); setDeptId(null); setPage(1); reload(); }}>
                <RotateCcw /> 重置
              </Button>
            </div>
          </Card>

          {/* 表格 */}
          <Card className="py-4">
            <div className="px-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>部门</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>手机号</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>最后登录</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-7">
                            <AvatarFallback>{row.nickname.slice(0, 1)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-[13px] font-medium">{row.nickname}</div>
                            <div className="text-muted-foreground text-xs">{row.username}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[13px]">{row.deptName || '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {row.roles.map((r) => (
                            <Badge key={r.id} variant="secondary" className="text-[10.5px]">{r.name}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-[13px] tabular-nums">{row.phone || '—'}</TableCell>
                      <TableCell><StatusBadge status={row.status} /></TableCell>
                      <TableCell className="text-muted-foreground text-xs tabular-nums">
                        {row.lastLoginAt ? dayjs(row.lastLoginAt).format('MM-DD HH:mm') : '从未登录'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Can perm="system:user:update">
                            <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(row)} title="编辑">
                              <Pencil className="size-3.5" />
                            </Button>
                          </Can>
                          <Can perm="system:user:resetPwd">
                            <Button variant="ghost" size="icon" className="size-7" onClick={() => setResetTarget(row)} title="重置密码">
                              <KeyRound className="size-3.5" />
                            </Button>
                          </Can>
                          <Can perm="system:user:delete">
                            <Button variant="ghost" size="icon" className="text-destructive size-7" onClick={() => handleDelete(row)} title="删除">
                              <Trash2 className="size-3.5" />
                            </Button>
                          </Can>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && list.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-muted-foreground h-24 text-center text-sm">暂无数据</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1); }} />
            </div>
          </Card>
        </div>
      </div>

      {/* 新增/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑用户' : '新增用户'}</DialogTitle>
            <DialogDescription>
              {editing ? `修改 ${editing.nickname} 的资料` : '新建系统账号，默认密码取自系统参数'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {!editing && (
              <FieldRow label="账号">
                <Input value={form.username ?? ''} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="字母开头，3-32 位" />
              </FieldRow>
            )}
            <FieldRow label="昵称">
              <Input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
            </FieldRow>
            <FieldRow label="所属部门">
              <Select
                value={form.deptId ? String(form.deptId) : 'none'}
                onValueChange={(v) => setForm({ ...form, deptId: v === 'none' ? null : Number(v) })}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="选择部门" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">未分配</SelectItem>
                  {flatDepts.map(({ node, depth }) => (
                    <SelectItem key={node.id} value={String(node.id)}>
                      {'　'.repeat(depth)}{node.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="角色">
              <div className="flex flex-wrap gap-2">
                {roleOptions.map((r) => {
                  const checked = form.roleIds?.includes(r.id);
                  // 内置 admin 账号必须保留超级管理员角色(后端同样会拒绝)，否则会失去全部权限和菜单
                  const locked = editing?.id === 1 && r.code === 'super_admin';
                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={locked}
                      title={locked ? '内置管理员账号必须保留超级管理员角色' : undefined}
                      onClick={() => {
                        const ids = new Set(form.roleIds ?? []);
                        checked ? ids.delete(r.id) : ids.add(r.id);
                        setForm({ ...form, roleIds: [...ids] });
                      }}
                      className={`h-7 rounded-md border px-2.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${checked ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}
                    >
                      {r.name}
                    </button>
                  );
                })}
              </div>
            </FieldRow>
            <div className="grid grid-cols-2 gap-4">
              <FieldRow label="性别">
                <Select value={form.gender ?? '0'} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">保密</SelectItem>
                    <SelectItem value="1">男</SelectItem>
                    <SelectItem value="2">女</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="状态">
                <Select value={form.status ?? '0'} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">正常</SelectItem>
                    <SelectItem value="1">停用</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
            </div>
            <FieldRow label="手机号">
              <Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="选填" />
            </FieldRow>
            <FieldRow label="邮箱">
              <Input value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="选填" />
            </FieldRow>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={submit}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重置密码 */}
      <Dialog open={!!resetTarget} onOpenChange={(v) => !v && setResetTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>重置密码 · {resetTarget?.nickname}</DialogTitle>
            <DialogDescription>8-32 位，须包含字母和数字</DialogDescription>
          </DialogHeader>
          <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="新密码" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>取消</Button>
            <Button onClick={submitReset}>确认重置</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {void isSuperAdmin}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[84px_1fr] items-center gap-3">
      <Label className="text-[13px]">{label}</Label>
      {children}
    </div>
  );
}
