import { ReactNode } from 'react';
import { cn } from '~/lib/utils';

export interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
  className?: string;
}

export function MobileLayout({ children, title, actions, className }: MobileLayoutProps) {
  return (
    <div className={cn('mx-auto flex min-h-screen max-w-md flex-col bg-background', className)}>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-semibold">{title ?? 'Prometheus'}</h1>
        <div className="flex items-center gap-2">{actions}</div>
      </header>
      <main className="flex-1 px-4 py-4">{children}</main>
    </div>
  );
}
