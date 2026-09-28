import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RotateCcw, Search, Trash2 } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Card } from '@/ui/card';
import { Badge } from '@/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { Can, PageHeader, Pager } from '@/components/shared';
import { logApi, type OperationLogItem } from '@/api';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import { confirmDialog } from '@/components/ConfirmDialog';

const methodStyle: Record<string, string> = {
  POST: 'bg-emerald-600',
  PUT: 'bg-amber-500',
  DELETE: 'bg-red-600',
  GET: 'bg-blue-600',
};

export default function OperationLogPage() {
  const [list, setList] = useState<OperationLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);
  const [detail, setDetail] = useState<OperationLogItem | null>(null);

  async function fetchList() {
    const { data: env } = await logApi.operationLogs({ page, pageSize: 10, keyword: keyword || undefined });
    setList(env.data.list);
    setTotal(env.data.total);
  }
  useEffect(() => { fetchList(); }, [page, reloadKey]);

  async function handleClear() {
    if (!(await confirmDialog({ title: '清空操作日志', description: '将清空全部操作日志，此操作不可恢复。', confirmText: '确认清空' }))) return;
    await logApi.clearOperationLogs();
    toast.success('已清空');
    fetchList();
  }

  return (
    <div>
      <PageHeader title="操作日志" desc="写操作的全量审计" action={
        <Can perm="system:log:delete">
          <Button variant="outline" className="text-destructive" onClick={handleClear}><Trash2 /> 清空日志</Button>
        </Can>
      } />

      <Card className="gap-0 py-4">
        <div className="flex flex-wrap items-center gap-3 px-4 pb-3">
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setPage(1), reload())}
            placeholder="模块 / 操作人 / URL" className="w-64" />
          <Button variant="outline" onClick={() => { setPage(1); reload(); }}><Search /> 查询</Button>
          <Button variant="ghost" onClick={() => { setKeyword(''); setPage(1); reload(); }}><RotateCcw /> 重置</Button>
        </div>
        <div className="px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>模块</TableHead>
                <TableHead>操作</TableHead>
                <TableHead>操作人</TableHead>
                <TableHead>请求</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>耗时</TableHead>
                <TableHead>时间</TableHead>
                <TableHead className="text-right">详情</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((row) => (
                <TableRow key={row.id}>
                  <TableCell><Badge variant="secondary" className="text-[10.5px]">{row.title}</Badge></TableCell>
                  <TableCell className="text-[13px]">{row.action || '—'}</TableCell>
                  <TableCell className="text-[13px] font-medium">{row.username}</TableCell>
                  <TableCell>
                    <div className="flex max-w-72 items-center gap-1.5">
                      <span className={cn('rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white', methodStyle[row.method] ?? 'bg-zinc-500')}>
                        {row.method}
                      </span>
                      <span className="text-muted-foreground truncate font-mono text-[11px]">{row.url}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.ip}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === '0' ? 'success' : 'destructive'} className="text-[10.5px]">
                      {row.status === '0' ? '成功' : '失败'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={cn('text-xs tabular-nums', row.cost_ms > 300 ? 'text-amber-600' : 'text-muted-foreground')}>{row.cost_ms}ms</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs tabular-nums">{dayjs(row.oper_time).format('MM-DD HH:mm:ss')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setDetail(row)}>查看</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pager page={page} pageSize={10} total={total} onPage={setPage} onPageSize={() => {}} />
        </div>
      </Card>

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>操作详情</DialogTitle>
            <DialogDescription>{detail?.title} / {detail?.action}</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                <Kv k="操作人" v={detail.username} />
                <Kv k="IP" v={detail.ip} />
                <Kv k="请求方式" v={detail.method} />
                <Kv k="耗时" v={`${detail.cost_ms}ms`} />
                <Kv k="时间" v={dayjs(detail.oper_time).format('YYYY-MM-DD HH:mm:ss')} />
                <Kv k="状态" v={detail.status === '0' ? '成功' : '失败'} />
              </div>
              <div>
                <div className="mb-1.5 text-xs font-medium">请求地址</div>
                <div className="bg-muted rounded-md p-2.5 font-mono text-xs break-all">{detail.url}</div>
              </div>
              {detail.error_msg && (
                <div>
                  <div className="mb-1.5 text-xs font-medium">错误信息</div>
                  <div className="bg-red-500/10 text-destructive rounded-md p-2.5 text-xs break-all">{detail.error_msg}</div>
                </div>
              )}
              {detail.params && (
                <div>
                  <div className="mb-1.5 text-xs font-medium">请求参数</div>
                  <pre className="bg-muted max-h-52 overflow-auto rounded-md p-2.5 font-mono text-xs whitespace-pre-wrap break-all">{detail.params}</pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground shrink-0">{k}</span>
      <span className="truncate font-medium">{v}</span>
    </div>
  );
}
