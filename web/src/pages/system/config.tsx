import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Lock, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Badge } from '@/ui/badge';
import { Card } from '@/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { PageHeader, Pager, Can } from '@/components/shared';
import { configApi, type SysConfig } from '@/api';
import { confirmDialog } from '@/components/ConfirmDialog';

export default function ConfigPage() {
  const [list, setList] = useState<SysConfig[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SysConfig | null>(null);
  const [form, setForm] = useState({ name: '', key: '', value: '', remark: '' });

  async function fetchList() {
    const { data: env } = await configApi.page({ page, pageSize: 10, keyword: keyword || undefined });
    setList(env.data.list);
    setTotal(env.data.total);
  }
  useEffect(() => { fetchList(); }, [page, reloadKey]);

  async function submit() {
    if (!form.name || !form.key) return toast.warning('请填写完整');
    try {
      if (editing) {
        const target = list.find((c) => c.key === form.key);
        if (target) await configApi.update(target.id, form);
        toast.success('修改成功（即时生效）');
      } else {
        await configApi.create(form);
        toast.success('新增成功');
      }
      setOpen(false);
      fetchList();
    } catch { /* handled */ }
  }

  async function handleDelete(row: SysConfig) {
    if (!(await confirmDialog({ title: '删除参数', description: `确定要删除参数「${row.name}」吗？此操作不可恢复。` }))) return;
    await configApi.remove(row.id);
    toast.success('删除成功');
    fetchList();
  }

  return (
    <div>
      <PageHeader title="参数设置" desc="系统运行参数，修改后即时生效" action={
        <Can perm="system:config:create">
          <Button onClick={() => { setEditing(null); setForm({ name: '', key: '', value: '', remark: '' }); setOpen(true); }}>
            <Plus /> 新增参数
          </Button>
        </Can>
      } />

      <Card className="gap-0 py-4">
        <div className="flex flex-wrap items-center gap-3 px-4 pb-3">
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setPage(1), reload())}
            placeholder="参数名称 / 键名" className="w-60" />
          <Button variant="outline" onClick={() => { setPage(1); reload(); }}><Search /> 查询</Button>
          <Button variant="ghost" onClick={() => { setKeyword(''); setPage(1); reload(); }}><RotateCcw /> 重置</Button>
        </div>
        <div className="px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>参数名称</TableHead>
                <TableHead>键名</TableHead>
                <TableHead>键值</TableHead>
                <TableHead>内置</TableHead>
                <TableHead>备注</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-[13px] font-medium">{row.name}</TableCell>
                  <TableCell><code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[11px]">{row.key}</code></TableCell>
                  <TableCell>
                    {row.value === 'true' || row.value === 'false'
                      ? <Badge variant={row.value === 'true' ? 'success' : 'secondary'} className="text-[11px]">{row.value}</Badge>
                      : <span className="text-[13px] tabular-nums">{row.value}</span>}
                  </TableCell>
                  <TableCell>{row.isBuiltin ? <Lock className="text-amber-500 size-3.5" /> : '—'}</TableCell>
                  <TableCell className="text-muted-foreground max-w-40 truncate text-xs">{row.remark || '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Can perm="system:config:update">
                        <Button variant="ghost" size="icon" className="size-7"
                          onClick={() => { setEditing(row); setForm({ name: row.name, key: row.key, value: row.value, remark: row.remark }); setOpen(true); }}>
                          <Pencil className="size-3.5" />
                        </Button>
                      </Can>
                      {!row.isBuiltin && (
                        <Can perm="system:config:delete">
                          <Button variant="ghost" size="icon" className="text-destructive size-7" onClick={() => handleDelete(row)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </Can>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pager page={page} pageSize={10} total={total} onPage={setPage} onPageSize={() => {}} />
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑参数' : '新增参数'}</DialogTitle>
            <DialogDescription>内置参数不允许修改键名</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Row label="参数名称"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Row>
            <Row label="参数键名">
              <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })}
                disabled={!!editing && list.some((c) => c.key === form.key && c.isBuiltin)} />
            </Row>
            <Row label="参数键值"><Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></Row>
            <Row label="备注"><Input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></Row>
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
