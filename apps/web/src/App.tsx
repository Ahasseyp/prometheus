import { Link } from '@tanstack/react-router';

import { buttonVariants } from '@/components/ui/button.js';
import { HealthStatus } from '@/components/health-status.js';
import { cn } from '@/lib/utils.js';
import { isRegistrationEnabled } from '@/lib/env.js';

export function App() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Prometheus</h1>
          <p className="mt-2 text-sm text-muted-foreground">Personal finance tracker and planner</p>
        </div>
        <HealthStatus />
        {isRegistrationEnabled() && (
          <Link to="/register" className={cn(buttonVariants(), 'w-full')}>
            Create account
          </Link>
        )}
      </div>
    </main>
  );
}
