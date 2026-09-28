import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, RotateCcw, Search, Trash2, ArrowUp } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Textarea } from '@/ui/textarea';
import { Badge } from '@/ui/badge';
import { Card } from '@/ui/card';
import { Switch } from '@/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { PageHeader, Pager, Can } from '@/components/shared';
import { noticeApi, type NoticeItem } from '@/api';
import dayjs from 'dayjs';
import { confirmDialog } from '@/components/ConfirmDialog';

export default function NoticePage() {
  const [list, setList] = useState<NoticeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);
  const [type, setType] = useState('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NoticeItem | null>(null);
  const [form, setForm] = useState({ title: '', type: '1', content: '', status: '0', top: false });

  async function fetchList() {
    const { data: env } = await noticeApi.page({ page, pageSize: 10, keyword: keyword || undefined, type: type === 'all' ? undefined : type });
    setList(env.data.list);
    setTotal(env.data.total);
  }
  useEffect(() => { fetchList(); }, [page, reloadKey]);

  async function submit() {
    if (!form.title) return toast.warning('请填写标题');
    const payload = { ...form, top: form.top ? 'true' : 'false' };
    try {
      if (editing) {
        const target = list.find((n) => n.title === form.title);
        if (target) await noticeApi.update(target.id, payload);
        toast.success('修改成功');
      } else {
        await noticeApi.create(payload);
        toast.success('发布成功');
      }
      setOpen(false);
      fetchList();
    } catch { /* handled */ }
  }

  async function handleDelete(row: NoticeItem) {
    if (!(await confirmDialog({ title: '删除通知', description: `确定要删除通知「${row.title}」吗？此操作不可恢复。` }))) return;
    await noticeApi.remove(row.id);
    toast.success('删除成功');
    fetchList();
  }

  return (
    <div>
      <PageHeader title="通知公告" desc="面向全员的通知与公告发布" action={
        <Can perm="system:notice:create">
          <Button onClick={() => { setEditing(null); setForm({ title: '', type: '1', content: '', status: '0', top: false }); setOpen(true); }}>
            <Plus /> 发布公告
          </Button>
        </Can>
      } />

      <Card className="gap-0 py-4">
        <div className="flex flex-wrap items-center gap-3 px-4 pb-3">
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setPage(1), reload())}
            placeholder="搜索标题" className="w-60" />
          <Select value={type} onValueChange={(v) => { setType(v); setPage(1); reload(); }}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="1">通知</SelectItem>
              <SelectItem value="2">公告</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { setPage(1); reload(); }}><Search /> 查询</Button>
          <Button variant="ghost" onClick={() => { setKeyword(''); setType('all'); setPage(1); reload(); }}><RotateCcw /> 重置</Button>
        </div>
        <div className="px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>发布人</TableHead>
                <TableHead>发布时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex max-w-md items-center gap-2">
                      {row.top && <ArrowUp className="text-amber-500 size-3.5 shrink-0" />}
                      <span className="truncate text-[13px] font-medium">{row.title}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={row.type === '2' ? 'success' : 'default'} className="text-[11px]">{row.type === '2' ? '公告' : '通知'}</Badge></TableCell>
                  <TableCell><Badge variant={row.status === '0' ? 'success' : 'secondary'} className="text-[11px]">{row.status === '0' ? '已发布' : '已下线'}</Badge></TableCell>
                  <TableCell className="text-[13px]">{row.createdBy}</TableCell>
                  <TableCell className="text-muted-foreground text-xs tabular-nums">{dayjs(row.createdAt).format('YYYY-MM-DD HH:mm')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Can perm="system:notice:update">
                        <Button variant="ghost" size="icon" className="size-7"
                          onClick={() => { setEditing(row); setForm({ title: row.title, type: row.type, content: row.content || '', status: row.status, top: row.top }); setOpen(true); }}>
                          <Pencil className="size-3.5" />
                        </Button>
                      </Can>
                      <Can perm="system:notice:delete">
                        <Button variant="ghost" size="icon" className="text-destructive size-7" onClick={() => handleDelete(row)}>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑公告' : '发布公告'}</DialogTitle>
            <DialogDescription>支持简单 HTML 内容</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Row label="类型">
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="1">通知</SelectItem><SelectItem value="2">公告</SelectItem></SelectContent>
              </Select>
            </Row>
            <Row label="标题"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} /></Row>
            <Row label="内容"><Textarea rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></Row>
            <Row label="状态">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="0">发布</SelectItem><SelectItem value="1">下线</SelectItem></SelectContent>
              </Select>
            </Row>
            <Row label="置顶">
              <Switch checked={form.top} onCheckedChange={(v) => setForm({ ...form, top: v })} />
            </Row>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={submit}>{editing ? '保存' : '发布'}</Button>
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
