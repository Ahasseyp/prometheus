import { useQuery } from '@tanstack/react-query';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@prometheus/api/router';

import { trpc } from '@/gateways/trpc.js';

export type ReportingSummary = inferRouterOutputs<AppRouter>['reporting']['summary'];
export type ReportingAccount = ReportingSummary['accounts'][number];

export const reportingSummaryQueryKey = ['reporting', 'summary'];

export function useReportingSummary() {
  return useQuery({
    queryKey: reportingSummaryQueryKey,
    queryFn: () => trpc.reporting.summary.query(),
  });
}
