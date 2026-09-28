import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChevronRight, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Badge } from '@/ui/badge';
import { Card } from '@/ui/card';
import { Switch } from '@/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { PageHeader, StatusBadge, Can } from '@/components/shared';
import { menuApi, type MenuTreeNode, type MenuForm } from '@/api';
import { cn } from '@/lib/utils';
import { confirmDialog } from '@/components/ConfirmDialog';

type FlatMenu = MenuTreeNode & { depth: number; hasChildren: boolean };

export default function MenuPage() {
  const [tree, setTree] = useState<MenuTreeNode[]>([]);
  const [keyword, setKeyword] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MenuTreeNode | null>(null);
  const [form, setForm] = useState<MenuForm>({ parentId: 0, name: '', type: 'C', path: '', component: '', perms: '', icon: '', orderNum: 0, visible: true, keepAlive: true, status: '0' });
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  async function fetchTree() {
    const { data: env } = await menuApi.tree(keyword || undefined);
    setTree(env.data);
    // 默认展开全部
    const ids = new Set<number>();
    const walk = (nodes: MenuTreeNode[]) => nodes.forEach((n) => {
      const children = n.children;
      if (children?.length) { ids.add(n.id); walk(children); }
    });
    walk(env.data);
    setExpanded(ids);
  }

  useEffect(() => { fetchTree(); }, [reloadKey]);

  const flat: FlatMenu[] = [];
  const flatten = (nodes: MenuTreeNode[], depth: number) => {
    nodes.forEach((n) => {
      const children = n.children;
      flat.push({ ...n, depth, hasChildren: !!children?.length });
      if (children?.length && expanded.has(n.id)) flatten(children, depth + 1);
    });
  };
  flatten(tree, 0);

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function openCreate(parent?: MenuTreeNode) {
    setEditing(null);
    setForm({
      parentId: parent?.id ?? 0, name: '', type: parent ? 'C' : 'M',
      path: '', component: '', perms: '', icon: '', orderNum: 0,
      visible: true, keepAlive: true, status: '0',
    });
    setOpen(true);
  }

  async function openEdit(row: MenuTreeNode) {
    setEditing(row);
    const { data: env } = await menuApi.detail(row.id);
    setForm(env.data);
    setOpen(true);
  }

  async function submit() {
    if (!form.name) return toast.warning('请填写名称');
    try {
      if (editing) { await menuApi.update(editing.id, form); toast.success('修改成功'); }
      else { await menuApi.create(form); toast.success('新增成功'); }
      setOpen(false);
      fetchTree();
    } catch { /* handled */ }
  }

  async function handleDelete(row: MenuTreeNode) {
    if (!(await confirmDialog({ title: '删除菜单', description: `确定要删除菜单「${row.name}」吗？此操作不可恢复。` }))) return;
    await menuApi.remove(row.id);
    toast.success('删除成功');
    fetchTree();
  }

  const typeBadge = { M: 'secondary', C: 'default', F: 'outline' } as const;

  return (
    <div>
      <PageHeader title="菜单管理" desc="目录、菜单与按钮权限的三级配置" action={
        <Can perm="system:menu:create"><Button onClick={() => openCreate()}><Plus /> 新增顶级目录</Button></Can>
      } />

      <Card className="gap-0 py-4">
        <div className="flex flex-wrap items-center gap-3 px-4 pb-3">
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchTree()}
            placeholder="搜索菜单" className="w-60" />
          <Button variant="outline" onClick={fetchTree}><Search /> 查询</Button>
          <Button variant="ghost" onClick={() => { setKeyword(''); reload(); }}><RotateCcw /> 重置</Button>
        </div>
        <div className="px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>图标</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>路由地址</TableHead>
                <TableHead>权限标识</TableHead>
                <TableHead>可见</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flat.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex items-center gap-1.5" style={{ paddingLeft: row.depth * 20 }}>
                      {row.hasChildren ? (
                        <button type="button" onClick={() => toggleExpand(row.id)} className="text-muted-foreground hover:text-foreground">
                          <ChevronRight className={cn('size-3.5 transition-transform', expanded.has(row.id) && 'rotate-90')} />
                        </button>
                      ) : <span className="w-3.5" />}
                      <span className="text-[13px] font-medium">{row.name}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={typeBadge[row.type]} className="text-[10.5px]">{({ M: '目录', C: '菜单', F: '按钮' } as const)[row.type]}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-xs">{row.icon || '—'}</TableCell>
                  <TableCell className="text-center text-[13px] tabular-nums">{row.orderNum}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{row.path || '—'}</TableCell>
                  <TableCell>
                    {row.perms ? <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[11px]">{row.perms}</code> : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.visible ? 'success' : 'secondary'} className="text-[10.5px]">{row.visible ? '是' : '否'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {row.type !== 'F' && (
                        <Can perm="system:menu:create">
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => openCreate(row)} title="新增子项"><Plus className="size-3.5" /></Button>
                        </Can>
                      )}
                      <Can perm="system:menu:update">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(row)}><Pencil className="size-3.5" /></Button>
                      </Can>
                      <Can perm="system:menu:delete">
                        <Button variant="ghost" size="icon" className="text-destructive size-7" onClick={() => handleDelete(row)}><Trash2 className="size-3.5" /></Button>
                      </Can>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑菜单' : '新增菜单'}</DialogTitle>
            <DialogDescription>目录 → 菜单 → 按钮三级结构</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Row label="上级菜单">
              <Select value={String(form.parentId)} onValueChange={(v) => setForm({ ...form, parentId: Number(v) })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">顶级</SelectItem>
                  {flat.filter((m) => m.type !== 'F').map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>{'　'.repeat(m.depth)}{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
            <Row label="类型">
              <div className="flex gap-1.5">
                {(['M', 'C', 'F'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                    className={cn('h-8 rounded-md border px-3 text-xs transition-colors',
                      form.type === t ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent')}>
                    {{ M: '目录', C: '菜单', F: '按钮' }[t]}
                  </button>
                ))}
              </div>
            </Row>
            <Row label="名称"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Row>
            {form.type !== 'F' && <Row label="图标"><Input value={form.icon ?? ''} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="如 User" /></Row>}
            {form.type !== 'F' && <Row label="路由地址"><Input value={form.path ?? ''} onChange={(e) => setForm({ ...form, path: e.target.value })} placeholder="/system/user" /></Row>}
            {form.type === 'C' && <Row label="组件路径"><Input value={form.component ?? ''} onChange={(e) => setForm({ ...form, component: e.target.value })} placeholder="system/user" /></Row>}
            {form.type !== 'M' && <Row label="权限标识"><Input value={form.perms ?? ''} onChange={(e) => setForm({ ...form, perms: e.target.value })} placeholder="system:user:create" /></Row>}
            <Row label="排序"><Input type="number" value={form.orderNum ?? 0} onChange={(e) => setForm({ ...form, orderNum: Number(e.target.value) })} /></Row>
            <Row label="可见">
              <Switch checked={form.visible ?? true} onCheckedChange={(v) => setForm({ ...form, visible: v })} />
            </Row>
            <Row label="状态">
              <Select value={form.status ?? '0'} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="0">正常</SelectItem><SelectItem value="1">停用</SelectItem></SelectContent>
              </Select>
            </Row>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={submit}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {void tree}
      {void StatusBadge}
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
