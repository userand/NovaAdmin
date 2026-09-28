import { AlertTriangle } from 'lucide-react';
import { create } from 'zustand';
import { Button } from '@/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/dialog';
import { cn } from '@/lib/utils';

export interface ConfirmOptions {
  title: string;
  description?: string;
  /** 确认按钮文案，默认"确认删除" */
  confirmText?: string;
  cancelText?: string;
  /** 危险操作(红色确认按钮)，默认 true */
  destructive?: boolean;
}

interface ConfirmState {
  open: boolean;
  opts: ConfirmOptions;
  resolve: ((value: boolean) => void) | null;
}

const useConfirmStore = create<ConfirmState>(() => ({
  open: false,
  opts: { title: '' },
  resolve: null,
}));

function settle(value: boolean) {
  const { resolve } = useConfirmStore.getState();
  resolve?.(value);
  // 只关闭不清空 opts：保留内容直到关闭动画结束
  useConfirmStore.setState({ open: false, resolve: null });
}

/**
 * 命令式确认弹窗，替代浏览器原生 confirm()：
 *   if (!(await confirmDialog({ title: '删除用户', description: '……' }))) return;
 */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  useConfirmStore.getState().resolve?.(false); // 上一个未决的弹窗视为取消
  return new Promise<boolean>((resolve) => {
    useConfirmStore.setState({ open: true, opts, resolve });
  });
}

/** 全局挂载一次(main.tsx)，登录页等不在布局内的页面同样可用 */
export function ConfirmHost() {
  const { open, opts } = useConfirmStore();
  const destructive = opts.destructive ?? true;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && settle(false)}>
      <DialogContent showCloseButton={false} className="gap-5 sm:max-w-[410px]">
        <div className="flex gap-4">
          <span
            className={cn(
              'grid size-10 shrink-0 place-items-center rounded-full',
              destructive ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-muted text-foreground',
            )}
          >
            <AlertTriangle className="size-5" />
          </span>
          <DialogHeader className="gap-1.5 text-left">
            <DialogTitle className="leading-tight">{opts.title}</DialogTitle>
            <DialogDescription className="leading-relaxed">{opts.description}</DialogDescription>
          </DialogHeader>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => settle(false)}>
            {opts.cancelText ?? '取消'}
          </Button>
          <Button variant={destructive ? 'destructive' : 'default'} onClick={() => settle(true)}>
            {opts.confirmText ?? '确认删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
