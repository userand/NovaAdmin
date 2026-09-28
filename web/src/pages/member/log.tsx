import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { RotateCcw, Search } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Card } from '@/ui/card';
import { Badge } from '@/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';
import { PageHeader, Pager } from '@/components/shared';
import { memberApi, type MemberLogItem } from '@/api';

const METHOD: Record<string, string> = { phone_code: '手机验证码', email_code: '邮箱验证码', password: '账号密码', wechat: '微信' };

export default function MemberLogPage() {
  const [list, setList] = useState<MemberLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [method, setMethod] = useState('all');
  const [status, setStatus] = useState('all');

  async function fetchList(p = page, size = pageSize, over?: { method?: string; status?: string; keyword?: string }) {
    const m = over?.method ?? method;
    const s = over?.status ?? status;
    const k = over?.keyword ?? keyword;
    const { data: env } = await memberApi.logs({
      page: p, pageSize: size,
      keyword: k || undefined,
      method: m === 'all' ? undefined : m,
      status: s === 'all' ? undefined : s,
    });
    setList(env.data.list);
    setTotal(env.data.total);
  }
  useEffect(() => { fetchList(); }, [page, pageSize]);

  const search = () => { setPage(1); fetchList(1); };

  return (
    <div>
      <PageHeader title="会员登录日志" desc="移动端每一次登录尝试的审计记录，账号已脱敏" />

      <Card className="gap-0 py-4">
        <div className="flex flex-wrap items-center gap-3 px-4 pb-3">
          <Input
            value={keyword} onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="账号 / IP / 会员昵称" className="w-56"
          />
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="w-36"><SelectValue placeholder="全部方式" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部方式</SelectItem>
              {Object.entries(METHOD).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex h-8 items-center rounded-md border text-xs">
            {(['all', '0', '1'] as const).map((s) => (
              <button
                key={s} type="button"
                onClick={() => { setStatus(s); setPage(1); fetchList(1, pageSize, { status: s }); }}
                className={`h-full px-3 transition-colors first:rounded-l-md last:rounded-r-md ${status === s ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
              >
                {s === 'all' ? '全部' : s === '0' ? '成功' : '失败'}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={search}><Search /> 查询</Button>
          <Button
            variant="ghost"
            onClick={() => { setKeyword(''); setMethod('all'); setStatus('all'); setPage(1); fetchList(1, pageSize, { keyword: '', method: 'all', status: 'all' }); }}
          >
            <RotateCcw /> 重置
          </Button>
        </div>

        <div className="px-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>会员</TableHead>
                <TableHead>登录账号</TableHead>
                <TableHead>方式</TableHead>
                <TableHead>客户端</TableHead>
                <TableHead>IP 地址</TableHead>
                <TableHead>系统</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>提示消息</TableHead>
                <TableHead>时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-[13px] font-medium">{row.nickname ?? <span className="text-muted-foreground font-normal">未识别</span>}</TableCell>
                  <TableCell className="text-[13px] tabular-nums">{row.account}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10.5px]">{METHOD[row.method] ?? row.method}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-[13px]">{row.client || '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{row.ip}</TableCell>
                  <TableCell className="text-muted-foreground text-[13px]">{row.os}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === '0' ? 'success' : 'destructive'} className="text-[10.5px]">
                      {row.status === '0' ? '成功' : '失败'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[220px] truncate text-xs" title={row.message}>{row.message}</TableCell>
                  <TableCell className="text-muted-foreground text-xs tabular-nums">{dayjs(row.login_time).format('MM-DD HH:mm:ss')}</TableCell>
                </TableRow>
              ))}
              {list.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-muted-foreground py-12 text-center text-sm">暂无登录记录</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1); }} />
        </div>
      </Card>
    </div>
  );
}
