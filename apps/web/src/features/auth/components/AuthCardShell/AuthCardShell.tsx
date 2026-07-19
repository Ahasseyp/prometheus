import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card.js';

export type AuthCardShellProps = {
  children: ReactNode;
};

export function AuthCardShell({ children }: AuthCardShellProps) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center p-6">
      <Card className="w-full max-w-sm">{children}</Card>
    </main>
  );
}
