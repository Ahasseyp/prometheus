import { BudgetPeriod } from '@prometheus/domain';
import type { BudgetPeriod as DomainBudgetPeriod } from '@prometheus/domain';
import type { $Enums } from '@prisma/client';

const prismaBudgetPeriodMap: Record<$Enums.BudgetPeriod, DomainBudgetPeriod> = {
  WEEKLY: BudgetPeriod.Weekly,
  MONTHLY: BudgetPeriod.Monthly,
  YEARLY: BudgetPeriod.Yearly,
};

const domainBudgetPeriodMap = Object.fromEntries(
  Object.entries(prismaBudgetPeriodMap).map(([prisma, domain]) => [domain, prisma])
) as Record<DomainBudgetPeriod, $Enums.BudgetPeriod>;

export function mapPrismaBudgetPeriod(period: $Enums.BudgetPeriod): DomainBudgetPeriod {
  return prismaBudgetPeriodMap[period];
}

export function mapDomainBudgetPeriod(period: DomainBudgetPeriod): $Enums.BudgetPeriod {
  return domainBudgetPeriodMap[period];
}
