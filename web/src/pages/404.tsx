import { useNavigate } from 'react-router-dom';
import { Button } from '@/ui/button';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center">
      <div className="text-[88px] leading-none font-bold tracking-tight tabular-nums">404</div>
      <h2 className="mt-4 text-lg font-semibold">页面不存在</h2>
      <p className="text-muted-foreground mt-1.5 text-sm">您访问的页面不存在或已被移除</p>
      <div className="mt-6 flex gap-2">
        <Button onClick={() => navigate('/')}>返回首页</Button>
        <Button variant="outline" onClick={() => navigate(-1)}>返回上一页</Button>
      </div>
    </div>
  );
}
