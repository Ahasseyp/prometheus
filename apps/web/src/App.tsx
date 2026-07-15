import { HealthStatus } from '@/components/health-status.js';

export function App() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Prometheus</h1>
          <p className="mt-2 text-sm text-muted-foreground">Personal finance tracker and planner</p>
        </div>
        <HealthStatus />
      </div>
    </main>
  );
}
