import { Activity, AlertCircle, Loader2 } from 'lucide-react';

import { createHealthGateway, healthGateway } from '@/gateways/health.js';

type HealthStatusProps = {
  gateway?: ReturnType<typeof createHealthGateway>;
};

export function HealthStatus({ gateway = healthGateway }: HealthStatusProps) {
  const { data, isLoading, isError, refetch } = gateway.useHealth();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span>Checking backend health...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="size-4" />
          <span className="font-medium">Backend unreachable</span>
        </div>
        <p className="text-sm text-muted-foreground">
          The app could not connect to the API. Make sure the backend is running.
        </p>
        <button
          type="button"
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
          onClick={() => refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
        <Activity className="size-5 text-primary" />
      </div>
      <div>
        <p className="text-sm font-medium">Backend health</p>
        <p className="text-xs text-muted-foreground">Status: {data?.status ?? 'unknown'}</p>
      </div>
    </div>
  );
}
