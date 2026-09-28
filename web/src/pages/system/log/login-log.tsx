import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RotateCcw, Search, Trash2 } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Card } from '@/ui/card';
import { Badge } from '@/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { Can, PageHeader, Pager } from '@/components/shared';
import { logApi, type LoginLogItem } from '@/api';
import dayjs from 'dayjs';
import { confirmDialog } from '@/components/ConfirmDialog';

export default function LoginLogPage() {
  const [list, setList] = useState<LoginLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);
  const [status, setStatus] = useState('all');

  async function fetchList() {
    const { data: env } = await logApi.loginLogs({
      page, pageSize: 10,
      keyword: keyword || undefined,
      status: status === 'all' ? undefined : status,
    });
    setList(env.data.list);
    setTotal(env.data.total);
  }
  useEffect(() => { fetchList(); }, [page, reloadKey]);

  async function handleClear() {
    if (!(await confirmDialog({ title: '清空登录日志', description: '将清空全部登录日志，此操作不可恢复。', confirmText: '确认清空' }))) return;
    await logApi.clearLoginLogs();
    toast.success('已清空');
    fetchList();
  }

  return (
    <div>
      <PageHeader title="登录日志" desc="每一次登录尝试的安全审计" action={
        <Can perm="system:log:delete">
          <Button variant="outline" className="text-destructive" onClick={handleClear}><Trash2 /> 清空日志</Button>
        </Can>
      } />

      <Card className="gap-0 py-4">
        <div className="flex flex-wrap items-center gap-3 px-4 pb-3">
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setPage(1), reload())}
            placeholder="账号 / IP" className="w-56" />
          <div className="flex h-8 items-center rounded-md border text-xs">
            {(['all', '0', '1'] as const).map((s) => (
              <button key={s} type="button"
                onClick={() => { setStatus(s); setPage(1); reload(); }}
                className={`h-full px-3 transition-colors first:rounded-l-md last:rounded-r-md ${status === s ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
                {s === 'all' ? '全部' : s === '0' ? '成功' : '失败'}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={() => { setPage(1); reload(); }}><Search /> 查询</Button>
          <Button variant="ghost" onClick={() => { setKeyword(''); setStatus('all'); setPage(1); reload(); }}><RotateCcw /> 重置</Button>
        </div>
        <div className="px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>账号</TableHead>
                <TableHead>IP 地址</TableHead>
                <TableHead>归属地</TableHead>
                <TableHead>浏览器</TableHead>
                <TableHead>操作系统</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>提示消息</TableHead>
                <TableHead>时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-[13px] font-medium">{row.username}</TableCell>
                  <TableCell className="font-mono text-xs">{row.ip}</TableCell>
                  <TableCell className="text-muted-foreground text-[13px]">{row.location}</TableCell>
                  <TableCell className="text-muted-foreground text-[13px]">{row.browser}</TableCell>
                  <TableCell className="text-muted-foreground text-[13px]">{row.os}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === '0' ? 'success' : 'destructive'} className="text-[10.5px]">
                      {row.status === '0' ? '成功' : '失败'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{row.message}</TableCell>
                  <TableCell className="text-muted-foreground text-xs tabular-nums">{dayjs(row.login_time).format('MM-DD HH:mm:ss')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pager page={page} pageSize={10} total={total} onPage={setPage} onPageSize={() => {}} />
        </div>
      </Card>
    </div>
  );
}
