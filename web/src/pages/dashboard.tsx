import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import {
  Area, AreaChart, CartesianGrid, Cell, Line, Pie, PieChart,
  RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Badge } from '@/ui/badge';
import { Avatar, AvatarFallback } from '@/ui/avatar';
import { dashboardApi, type DashboardStats, type TrendPoint, type NameValue, type RecentLogin } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';

dayjs.locale('zh-cn');

/** 数字滚动(轻量) */
function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    const dur = 700;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const p = Math.min((performance.now() - start) / dur, 1);
      setDisplay(Math.round(from + (value - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) timer = setTimeout(tick, 16);
      else fromRef.current = value;
    };
    timer = setTimeout(tick, 16);
    return () => clearTimeout(timer);
  }, [value]);
  return <span className="tabular-nums">{display.toLocaleString()}</span>;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const userInfo = useAuthStore((s) => s.userInfo);
  const isDark = useUIStore((s) => s.isDark);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [deptDist, setDeptDist] = useState<NameValue[]>([]);
  const [gender, setGender] = useState<NameValue[]>([]);
  const [recent, setRecent] = useState<RecentLogin[]>([]);

  useEffect(() => {
    Promise.all([
      dashboardApi.stats(), dashboardApi.loginTrend(), dashboardApi.deptDistribution(),
      dashboardApi.genderRatio(), dashboardApi.recentLogins(),
    ]).then(([s, t, d, g, r]) => {
      setStats(s.data.data); setTrend(t.data.data); setDeptDist(d.data.data);
      setGender(g.data.data); setRecent(r.data.data);
    });
  }, []);

  const now = dayjs();
  const hour = now.hour();
  const greeting = hour < 9 ? '早上好' : hour < 12 ? '上午好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';

  const fg = isDark ? '#fafafa' : '#18181b';
  const gridColor = isDark ? '#27272a' : '#f4f4f5';
  const labelColor = isDark ? '#a1a1aa' : '#71717a';
  const pieColors = isDark
    ? ['#fafafa', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#2d2d30', '#1f1f23']
    : ['#18181b', '#3f3f46', '#52525b', '#71717a', '#a1a1aa', '#c4c4cc', '#d4d4d8', '#e4e4e7'];
  const tooltipStyle = {
    background: isDark ? '#18181b' : '#fff',
    border: `1px solid ${isDark ? '#27272a' : '#e4e4e7'}`,
    borderRadius: 8,
    fontSize: 12,
    boxShadow: '0 4px 16px rgb(0 0 0 / 0.08)',
  };

  // 说明文字取代原先写死的"涨幅"占位数字，避免展示并非真实统计的数据
  const cards = [
    { label: '用户总数', value: stats?.totalUsers ?? 0, caption: '全部有效账号' },
    { label: '7 日活跃用户', value: stats?.activeUsers7d ?? 0, caption: '近 7 天有成功登录' },
    { label: '7 日操作次数', value: stats?.operations7d ?? 0, caption: '近 7 天写操作审计' },
    { label: '生效通知', value: stats?.notices ?? 0, caption: '当前对外展示' },
  ];

  const malePct = (() => {
    const total = gender.reduce((s, g) => s + g.value, 0) || 1;
    return Math.round(((gender.find((g) => g.name === '男')?.value ?? 0) / total) * 100);
  })();

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">
          {greeting}，{userInfo?.nickname || '朋友'}
        </h1>
        <p className="text-muted-foreground mt-1 text-[13px]">
          {now.format('YYYY年MM月DD日 dddd')} · 系统运行正常
        </p>
      </div>

      {/* 统计卡 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-card rounded-xl border p-5 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-400 hover:shadow-md"
          >
            <div className="text-muted-foreground text-[13px] font-medium">{c.label}</div>
            <div className="mt-2 text-[28px] leading-none font-semibold tracking-tight">
              <CountUp value={c.value} />
            </div>
            <div className="text-muted-foreground mt-2.5 text-xs">{c.caption}</div>
          </div>
        ))}
      </div>

      {/* 图表 */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* 登录趋势 */}
        <section className="bg-card rounded-xl border p-5 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] lg:col-span-3">
          <header className="mb-3 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">登录趋势</h3>
            <span className="text-muted-foreground text-xs">近 14 天</span>
          </header>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: -18, right: 6, top: 6 }}>
                <defs>
                  <linearGradient id="gSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={fg} stopOpacity={0.14} />
                    <stop offset="100%" stopColor={fg} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={gridColor} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: labelColor }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: labelColor }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: fg }} cursor={{ stroke: labelColor, strokeOpacity: 0.3 }} />
                <Area
                  type="monotone" dataKey="success" name="成功登录" stroke={fg} strokeWidth={2} fill="url(#gSuccess)"
                  activeDot={{ r: 4, strokeWidth: 2, stroke: isDark ? '#18181b' : '#fff' }}
                />
                <Line type="monotone" dataKey="failed" name="失败尝试" stroke={labelColor} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 部门分布 */}
        <section className="bg-card rounded-xl border p-5 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] lg:col-span-2">
          <header className="mb-3 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">部门人数分布</h3>
            <span className="text-muted-foreground text-xs">在职统计</span>
          </header>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip formatter={(v: number, n: string) => [`${v} 人`, n]} contentStyle={tooltipStyle} />
                <Pie
                  data={deptDist} dataKey="value" nameKey="name"
                  innerRadius="58%" outerRadius="82%" paddingAngle={2} strokeWidth={0}
                >
                  {deptDist.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
            {deptDist.map((d, i) => (
              <span key={d.name} className="flex items-center gap-1.5 text-xs">
                <span className="size-2 rounded-full" style={{ background: pieColors[i % pieColors.length] }} />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="font-medium">{d.value}</span>
              </span>
            ))}
          </div>
        </section>

        {/* 性别占比 */}
        <section className="bg-card rounded-xl border p-5 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]">
          <header className="mb-3 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">性别占比</h3>
            <span className="text-muted-foreground text-xs">全员统计</span>
          </header>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                data={[{ name: '男性占比', value: malePct, fill: fg }]}
                innerRadius="68%" outerRadius="100%" startAngle={90} endAngle={-270}
              >
                <RadialBar dataKey="value" cornerRadius={12} background={{ fill: gridColor }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="-mt-[120px] flex flex-col items-center pb-[52px]">
            <span className="text-[26px] font-semibold tabular-nums">{malePct}%</span>
            <span className="text-muted-foreground mt-0.5 text-xs">男性占比</span>
          </div>
        </section>

        {/* 最新登录 */}
        <section className="bg-card rounded-xl border p-5 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] lg:col-span-2">
          <header className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">最新登录记录</h3>
            <span className="text-muted-foreground text-xs">实时审计</span>
          </header>
          <div className="-mx-2 max-h-[292px] space-y-0.5 overflow-y-auto px-2">
            {recent.map((item, i) => (
              <div
                key={`${item.username}-${i}`}
                className="hover:bg-muted/60 flex cursor-default items-center gap-3 rounded-md px-2 py-2 transition-colors"
                onClick={() => navigate('/system/log/login')}
              >
                <Avatar className="size-7">
                  <AvatarFallback>{item.username.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium">{item.username}</div>
                  <div className="text-muted-foreground truncate text-[11.5px]">
                    {item.browser} · {item.os}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <Badge variant={item.status === '0' ? 'success' : 'destructive'} className="text-[10.5px]">
                    {item.status === '0' ? '成功' : '失败'}
                  </Badge>
                  <time className="text-muted-foreground text-[11px] tabular-nums">
                    {dayjs(item.login_time).format('MM-DD HH:mm')}
                  </time>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
