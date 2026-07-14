import { Badge } from '~/components/ui/badge';
import { cn } from '~/lib/utils';
import type { CurrencyCode } from '~/domain/money';

export interface CurrencyBadgeProps {
  currency: CurrencyCode;
  className?: string;
}

export function CurrencyBadge({ currency, className }: CurrencyBadgeProps) {
  return (
    <Badge variant="outline" className={cn('font-mono uppercase', className)}>
      {currency}
    </Badge>
  );
}
