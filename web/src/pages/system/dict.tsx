import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Badge } from '@/ui/badge';
import { Card } from '@/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { PageHeader, Pager, StatusBadge, Can } from '@/components/shared';
import { dictApi, type DictType, type DictData } from '@/api';
import { confirmDialog } from '@/components/ConfirmDialog';

export default function DictPage() {
  const [types, setTypes] = useState<DictType[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);
  const [active, setActive] = useState<DictType | null>(null);
  const [datas, setDatas] = useState<DictData[]>([]);

  const [typeOpen, setTypeOpen] = useState(false);
  const [editingType, setEditingType] = useState<DictType | null>(null);
  const [typeForm, setTypeForm] = useState({ name: '', code: '', status: '0', remark: '' });

  const [dataOpen, setDataOpen] = useState(false);
  const [editingData, setEditingData] = useState<DictData | null>(null);
  const [dataForm, setDataForm] = useState<Omit<DictData, 'id' | 'createdAt'>>({ typeCode: '', label: '', value: '', tagType: 'secondary', orderNum: 0, status: '0', remark: '' });

  async function fetchTypes() {
    const { data: env } = await dictApi.typePage({ page, pageSize: 10, keyword: keyword || undefined });
    setTypes(env.data.list);
    setTotal(env.data.total);
    if (active) {
      const found = env.data.list.find((t) => t.id === active.id);
      setActive(found ?? null);
    }
  }
  useEffect(() => { fetchTypes(); }, [page, reloadKey]);

  async function openDetail(t: DictType) {
    setActive(t);
    const { data: env } = await dictApi.dataList(t.code);
    setDatas(env.data);
  }

  async function submitType() {
    if (!typeForm.name || !typeForm.code) return toast.warning('请填写完整');
    try {
      if (editingType) {
        const target = types.find((t) => t.code === typeForm.code);
        if (target) await dictApi.updateType(target.id, typeForm);
        toast.success('修改成功');
      } else {
        await dictApi.createType(typeForm);
        toast.success('新增成功');
      }
      setTypeOpen(false);
      fetchTypes();
    } catch { /* handled */ }
  }

  async function submitData() {
    if (!dataForm.label || !dataForm.value) return toast.warning('请填写完整');
    try {
      if (editingData) { await dictApi.updateData(editingData.id, dataForm); toast.success('修改成功'); }
      else { await dictApi.createData(dataForm); toast.success('新增成功'); }
      setDataOpen(false);
      if (active) openDetail(active);
      fetchTypes();
    } catch { /* handled */ }
  }

  async function handleDeleteType(t: DictType) {
    if (!(await confirmDialog({ title: '删除字典', description: `确定要删除字典「${t.name}」吗？此操作不可恢复。` }))) return;
    await dictApi.removeType(t.id);
    toast.success('删除成功');
    if (active?.id === t.id) setActive(null);
    fetchTypes();
  }

  async function handleDeleteData(d: DictData) {
    if (!(await confirmDialog({ title: '删除字典项', description: `确定要删除字典项「${d.label}」吗？此操作不可恢复。` }))) return;
    await dictApi.removeData(d.id);
    toast.success('删除成功');
    if (active) openDetail(active);
    fetchTypes();
  }

  const tagVariant = (t: string) =>
    (['default', 'secondary', 'destructive', 'outline', 'success', 'warning'] as const).includes(t as never)
      ? (t as 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning')
      : 'secondary';

  return (
    <div>
      <PageHeader title="字典管理" desc="业务枚举的统一维护" />

      {/* 类型列表 */}
      {!active && (
        <Card className="gap-0 py-4">
          <div className="flex flex-wrap items-center gap-3 px-4 pb-3">
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setPage(1), reload())}
              placeholder="字典名称 / 编码" className="w-60" />
            <Button variant="outline" onClick={() => { setPage(1); reload(); }}><Search /> 查询</Button>
            <Button variant="ghost" onClick={() => { setKeyword(''); setPage(1); reload(); }}><RotateCcw /> 重置</Button>
            <div className="flex-1" />
            <Can perm="system:dict:create">
              <Button onClick={() => { setEditingType(null); setTypeForm({ name: '', code: '', status: '0', remark: '' }); setTypeOpen(true); }}>
                <Plus /> 新增类型
              </Button>
            </Can>
          </div>
          <div className="px-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>字典名称</TableHead>
                  <TableHead>编码</TableHead>
                  <TableHead>数据量</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <button type="button" className="hover:underline font-medium" onClick={() => openDetail(t)}>{t.name}</button>
                    </TableCell>
                    <TableCell><code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[11px]">{t.code}</code></TableCell>
                    <TableCell className="text-center text-[13px] tabular-nums">{t.dataCount}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell className="text-muted-foreground max-w-40 truncate text-xs">{t.remark || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => openDetail(t)}>数据</Button>
                        <Can perm="system:dict:update">
                          <Button variant="ghost" size="icon" className="size-7"
                            onClick={() => { setEditingType(t); setTypeForm({ name: t.name, code: t.code, status: t.status, remark: t.remark }); setTypeOpen(true); }}>
                            <Pencil className="size-3.5" />
                          </Button>
                        </Can>
                        <Can perm="system:dict:delete">
                          <Button variant="ghost" size="icon" className="text-destructive size-7" onClick={() => handleDeleteType(t)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </Can>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pager page={page} pageSize={10} total={total} onPage={setPage} onPageSize={() => {}} />
          </div>
        </Card>
      )}

      {/* 字典数据(从视图) */}
      {active && (
        <Card className="gap-0 py-4">
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-2.5">
              <Button variant="ghost" size="icon" className="size-7" onClick={() => setActive(null)}><ArrowLeft className="size-4" /></Button>
              <span className="text-[15px] font-semibold">{active.name}</span>
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[11px]">{active.code}</code>
            </div>
            <Can perm="system:dict:create">
              <Button onClick={() => { setEditingData(null); setDataForm({ ...dataForm, typeCode: active.code, label: '', value: '' }); setDataOpen(true); }}>
                <Plus /> 新增数据
              </Button>
            </Can>
          </div>
          <div className="px-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标签</TableHead>
                  <TableHead>键值</TableHead>
                  <TableHead>样式</TableHead>
                  <TableHead>排序</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datas.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell><Badge variant={tagVariant(d.tagType)} className="text-[11px]">{d.label}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{d.value}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{d.tagType}</TableCell>
                    <TableCell className="text-center text-[13px] tabular-nums">{d.orderNum}</TableCell>
                    <TableCell><StatusBadge status={d.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Can perm="system:dict:update">
                          <Button variant="ghost" size="icon" className="size-7"
                            onClick={() => { setEditingData(d); setDataForm({ typeCode: d.typeCode, label: d.label, value: d.value, tagType: d.tagType, orderNum: d.orderNum, status: d.status, remark: d.remark }); setDataOpen(true); }}>
                            <Pencil className="size-3.5" />
                          </Button>
                        </Can>
                        <Can perm="system:dict:delete">
                          <Button variant="ghost" size="icon" className="text-destructive size-7" onClick={() => handleDeleteData(d)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </Can>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* 类型对话框 */}
      <Dialog open={typeOpen} onOpenChange={setTypeOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editingType ? '编辑字典类型' : '新增字典类型'}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <Row label="名称"><Input value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} placeholder="如：系统开关" /></Row>
            <Row label="编码"><Input value={typeForm.code} onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })} placeholder="如：sys_status" /></Row>
            <Row label="状态">
              <Select value={typeForm.status} onValueChange={(v) => setTypeForm({ ...typeForm, status: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="0">正常</SelectItem><SelectItem value="1">停用</SelectItem></SelectContent>
              </Select>
            </Row>
            <Row label="备注"><Input value={typeForm.remark} onChange={(e) => setTypeForm({ ...typeForm, remark: e.target.value })} /></Row>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeOpen(false)}>取消</Button>
            <Button onClick={submitType}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 数据对话框 */}
      <Dialog open={dataOpen} onOpenChange={setDataOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editingData ? '编辑字典数据' : '新增字典数据'}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <Row label="标签"><Input value={dataForm.label} onChange={(e) => setDataForm({ ...dataForm, label: e.target.value })} /></Row>
            <Row label="键值"><Input value={dataForm.value} onChange={(e) => setDataForm({ ...dataForm, value: e.target.value })} /></Row>
            <Row label="标签样式">
              <Select value={dataForm.tagType} onValueChange={(v) => setDataForm({ ...dataForm, tagType: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['default', 'secondary', 'destructive', 'success', 'warning', 'outline'].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
            <Row label="排序"><Input type="number" value={dataForm.orderNum} onChange={(e) => setDataForm({ ...dataForm, orderNum: Number(e.target.value) })} /></Row>
            <Row label="状态">
              <Select value={dataForm.status} onValueChange={(v) => setDataForm({ ...dataForm, status: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="0">正常</SelectItem><SelectItem value="1">停用</SelectItem></SelectContent>
              </Select>
            </Row>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDataOpen(false)}>取消</Button>
            <Button onClick={submitData}>确定</Button>
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
