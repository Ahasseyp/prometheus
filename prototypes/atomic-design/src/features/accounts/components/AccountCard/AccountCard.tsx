import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { Money } from '~/components/atoms/Money';
import { CurrencyBadge } from '~/components/atoms/CurrencyBadge';
import type { Money as MoneyType } from '~/domain/money';

export interface AccountCardProps {
  name: string;
  type: string;
  balance: MoneyType;
  onClick?: () => void;
}

export function AccountCard({ name, type, balance, onClick }: AccountCardProps) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md active:scale-[0.99]"
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{name}</CardTitle>
            <CardDescription>{type}</CardDescription>
          </div>
          <CurrencyBadge currency={balance.currency} />
        </div>
      </CardHeader>
      <CardContent>
        <Money value={balance} className="text-2xl" />
      </CardContent>
    </Card>
  );
}
