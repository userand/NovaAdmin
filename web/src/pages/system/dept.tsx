import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChevronRight, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Card } from '@/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { PageHeader, StatusBadge, Can } from '@/components/shared';
import { deptApi, type DeptTreeNode, type DeptForm } from '@/api';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import { confirmDialog } from '@/components/ConfirmDialog';

export default function DeptPage() {
  const [tree, setTree] = useState<DeptTreeNode[]>([]);
  const [keyword, setKeyword] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DeptTreeNode | null>(null);
  const [form, setForm] = useState<DeptForm>({ parentId: 0, name: '', orderNum: 0, leader: '', phone: '', email: '', status: '0' });

  async function fetchTree() {
    const { data: env } = await deptApi.tree({ keyword: keyword || undefined });
    setTree(env.data);
    const ids = new Set<number>();
    const walk = (nodes: DeptTreeNode[]) => nodes.forEach((n) => {
      if (n.children?.length) { ids.add(n.id); walk(n.children); }
    });
    walk(env.data);
    setExpanded(ids);
  }

  useEffect(() => { fetchTree(); }, [reloadKey]);

  const flat: (DeptTreeNode & { depth: number; hasChildren: boolean })[] = [];
  const flatten = (nodes: DeptTreeNode[], depth: number) => {
    nodes.forEach((n) => {
      flat.push({ ...n, depth, hasChildren: !!n.children?.length });
      if (n.children?.length && expanded.has(n.id)) flatten(n.children, depth + 1);
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

  function openCreate(parent?: DeptTreeNode) {
    setEditing(null);
    setForm({ parentId: parent?.id ?? 0, name: '', orderNum: 0, leader: '', phone: '', email: '', status: '0' });
    setOpen(true);
  }

  function openEdit(row: DeptTreeNode) {
    setEditing(row);
    setForm({ id: row.id, parentId: row.parentId, name: row.name, orderNum: row.orderNum, leader: row.leader, phone: row.phone, email: row.email, status: row.status });
    setOpen(true);
  }

  async function submit() {
    if (!form.name) return toast.warning('请填写部门名称');
    try {
      if (editing) { await deptApi.update(editing.id, form); toast.success('修改成功'); }
      else { await deptApi.create(form); toast.success('新增成功'); }
      setOpen(false);
      fetchTree();
    } catch { /* handled */ }
  }

  async function handleDelete(row: DeptTreeNode) {
    if (!(await confirmDialog({ title: '删除部门', description: `确定要删除部门「${row.name}」吗？此操作不可恢复。` }))) return;
    await deptApi.remove(row.id);
    toast.success('删除成功');
    fetchTree();
  }

  return (
    <div>
      <PageHeader title="部门管理" desc="组织架构的树形维护" action={
        <Can perm="system:dept:create"><Button onClick={() => openCreate()}><Plus /> 新增顶级部门</Button></Can>
      } />

      <Card className="gap-0 py-4">
        <div className="flex flex-wrap items-center gap-3 px-4 pb-3">
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchTree()} placeholder="搜索部门" className="w-60" />
          <Button variant="outline" onClick={fetchTree}><Search /> 查询</Button>
          <Button variant="ghost" onClick={() => { setKeyword(''); reload(); }}><RotateCcw /> 重置</Button>
        </div>
        <div className="px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>部门名称</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>负责人</TableHead>
                <TableHead>联系电话</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
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
                  <TableCell className="text-center text-[13px] tabular-nums">{row.orderNum}</TableCell>
                  <TableCell className="text-[13px]">{row.leader || '—'}</TableCell>
                  <TableCell className="text-[13px] tabular-nums">{row.phone || '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{row.email || '—'}</TableCell>
                  <TableCell><StatusBadge status={row.status} /></TableCell>
                  <TableCell className="text-muted-foreground text-xs tabular-nums">{dayjs(row.createdAt).format('YYYY-MM-DD')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Can perm="system:dept:create">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => openCreate(row)}><Plus className="size-3.5" /></Button>
                      </Can>
                      <Can perm="system:dept:update">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(row)}><Pencil className="size-3.5" /></Button>
                      </Can>
                      <Can perm="system:dept:delete">
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑部门' : '新增部门'}</DialogTitle>
            <DialogDescription>维护部门树与负责人信息</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Row label="上级部门">
              <Select value={String(form.parentId)} onValueChange={(v) => setForm({ ...form, parentId: Number(v) })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">顶级</SelectItem>
                  {flat.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>{'　'.repeat(m.depth)}{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
            <Row label="部门名称"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Row>
            <Row label="排序"><Input type="number" value={form.orderNum ?? 0} onChange={(e) => setForm({ ...form, orderNum: Number(e.target.value) })} /></Row>
            <Row label="负责人"><Input value={form.leader ?? ''} onChange={(e) => setForm({ ...form, leader: e.target.value })} /></Row>
            <Row label="联系电话"><Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Row>
            <Row label="邮箱"><Input value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Row>
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
