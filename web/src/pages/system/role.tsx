import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Badge } from '@/ui/badge';
import { Card } from '@/ui/card';
import { Checkbox } from '@/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { PageHeader, Pager, StatusBadge, Can } from '@/components/shared';
import { roleApi, type SystemRole, type RoleForm, type RouteMenu } from '@/api';
import dayjs from 'dayjs';
import { confirmDialog } from '@/components/ConfirmDialog';

const dataScopes: Record<string, string> = { '1': '全部数据', '3': '本部门', '4': '本部门及以下', '5': '仅本人' };

export default function RolePage() {
  const [list, setList] = useState<SystemRole[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);
  const [menuTree, setMenuTree] = useState<RouteMenu[]>([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SystemRole | null>(null);
  const [form, setForm] = useState<RoleForm>({ name: '', code: '', orderNum: 0, dataScope: '1', remark: '', status: '0', menuIds: [] });

  async function fetchList() {
    const { data: env } = await roleApi.page({ page, pageSize, keyword: keyword || undefined });
    setList(env.data.list);
    setTotal(env.data.total);
  }

  useEffect(() => {
    fetchList();
  }, [page, pageSize, reloadKey]);

  useEffect(() => {
    roleApi.menuTree().then(({ data }) => setMenuTree(data.data));
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ name: '', code: '', orderNum: 0, dataScope: '1', remark: '', status: '0', menuIds: [] });
    setOpen(true);
  }

  async function openEdit(row: SystemRole) {
    setEditing(row);
    const { data: env } = await roleApi.detail(row.id);
    setForm(env.data);
    setOpen(true);
  }

  async function submit() {
    if (!form.name || !form.code) return toast.warning('请填写完整');
    // 合并半选父节点
    const ids = new Set(form.menuIds ?? []);
    collectHalfChecked(menuTree, form.menuIds ?? [], ids);
    const payload = { ...form, menuIds: [...ids] };
    try {
      if (editing) {
        await roleApi.update(editing.id, payload);
        toast.success('修改成功');
      } else {
        await roleApi.create(payload);
        toast.success('新增成功');
      }
      setOpen(false);
      fetchList();
    } catch { /* handled */ }
  }

  async function handleDelete(row: SystemRole) {
    if (!(await confirmDialog({ title: '删除角色', description: `确定要删除角色「${row.name}」吗？此操作不可恢复。` }))) return;
    await roleApi.remove(row.id);
    toast.success('删除成功');
    fetchList();
  }

  const checked = new Set(form.menuIds ?? []);

  function toggleMenu(m: RouteMenu) {
    const next = new Set(checked);
    const addAll = (node: RouteMenu, on: boolean) => {
      on ? next.add(node.id) : next.delete(node.id);
      node.children?.forEach((c) => addAll(c, on));
    };
    const isOn = next.has(m.id);
    addAll(m, !isOn);
    // 依赖父级的节点也应保留父级显示勾选(提交时用 collectHalfChecked 合并)
    setForm({ ...form, menuIds: [...next] });
  }

  return (
    <div>
      <PageHeader title="角色管理" desc="角色定义、菜单权限与数据权限配置" action={
        <Can perm="system:role:create"><Button onClick={openCreate}><Plus /> 新增角色</Button></Can>
      } />

      <Card className="gap-0 py-4">
        <div className="flex flex-wrap items-center gap-3 px-4 pb-3">
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setPage(1), reload())}
            placeholder="角色名称 / 编码" className="w-60" />
          <Button variant="outline" onClick={() => { setPage(1); reload(); }}><Search /> 查询</Button>
          <Button variant="ghost" onClick={() => { setKeyword(''); setPage(1); reload(); }}><RotateCcw /> 重置</Button>
        </div>
        <div className="px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>角色</TableHead>
                <TableHead>数据权限</TableHead>
                <TableHead>用户数</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>备注</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="text-[13px] font-medium">{row.name}</div>
                    <code className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 text-[11px]">{row.code}</code>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[11px]">{dataScopes[row.dataScope] ?? row.dataScope}</Badge></TableCell>
                  <TableCell className="text-center text-[13px] tabular-nums">{row.userCount}</TableCell>
                  <TableCell><StatusBadge status={row.status} /></TableCell>
                  <TableCell className="text-muted-foreground max-w-40 truncate text-xs">{row.remark || '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-xs tabular-nums">{dayjs(row.createdAt).format('YYYY-MM-DD')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Can perm="system:role:update">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(row)}><Pencil className="size-3.5" /></Button>
                      </Can>
                      <Can perm="system:role:delete">
                        {row.code !== 'super_admin' && (
                          <Button variant="ghost" size="icon" className="text-destructive size-7" onClick={() => handleDelete(row)}><Trash2 className="size-3.5" /></Button>
                        )}
                      </Can>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1); }} />
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑角色' : '新增角色'}</DialogTitle>
            <DialogDescription>配置角色编码、数据范围与菜单权限</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Row label="角色名称"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如：运营专员" /></Row>
            <Row label="角色编码"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="如：operator" disabled={editing?.code === 'super_admin'} /></Row>
            <Row label="数据权限">
              <Select value={form.dataScope ?? '1'} onValueChange={(v) => setForm({ ...form, dataScope: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(dataScopes).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
            <Row label="状态">
              <Select value={form.status ?? '0'} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="0">正常</SelectItem><SelectItem value="1">停用</SelectItem></SelectContent>
              </Select>
            </Row>
            <Row label="菜单权限">
              <div className="border-input max-h-56 overflow-y-auto rounded-md border p-3">
                {menuTree.map((m) => (
                  <MenuCheck key={m.id} item={m} checkedSet={checked} onChange={() => toggleMenu(m)} />
                ))}
              </div>
            </Row>
            <Row label="备注"><Input value={form.remark ?? ''} onChange={(e) => setForm({ ...form, remark: e.target.value })} placeholder="选填" /></Row>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={submit}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function MenuCheck({ item, checkedSet, onChange, depth = 0 }: {
  item: RouteMenu; checkedSet: Set<number>; onChange: () => void; depth?: number;
}) {
  const children = item.children ?? [];
  // 子级全选才算全选(半选不显示)
  const allChecked = children.length > 0 ? children.every((c) => isSubTreeChecked(c, checkedSet)) : checkedSet.has(item.id);
  const someChecked = children.length > 0
    ? children.some((c) => isSubTreeChecked(c, checkedSet) || checkedSet.has(c.id))
    : checkedSet.has(item.id);

  return (
    <div>
      <label className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded px-1.5 py-1" style={{ paddingLeft: 6 + depth * 18 }}>
        <Checkbox
          checked={allChecked ? true : someChecked ? 'indeterminate' : false}
          onCheckedChange={onChange}
        />
        <span className="text-[13px]">{item.name}</span>
        {item.type === 'F' && <Badge variant="outline" className="text-[10px]">按钮</Badge>}
      </label>
      {children.map((c) => (
        <MenuCheck key={c.id} item={c} checkedSet={checkedSet} onChange={onChange} depth={depth + 1} />
      ))}
    </div>
  );
}

function isSubTreeChecked(item: RouteMenu, set: Set<number>): boolean {
  const children = item.children ?? [];
  if (children.length === 0) return set.has(item.id);
  return children.every((c) => isSubTreeChecked(c, set));
}

function collectHalfChecked(items: RouteMenu[], selected: number[], out: Set<number>) {
  const sel = new Set(selected);
  const walk = (node: RouteMenu): { any: boolean } => {
    const childResults = (node.children ?? []).map(walk);
    const self = sel.has(node.id);
    const any = self || childResults.some((r) => r.any);
    if (any) out.add(node.id); // 半选父级也提交，保证后端树展开
    return { any };
  };
  items.forEach(walk);
}
