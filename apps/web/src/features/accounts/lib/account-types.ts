import { AccountType } from '@prometheus/domain';
import {
  Banknote,
  CreditCard,
  Landmark,
  PiggyBank,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export type AccountTypeMeta = {
  label: string;
  icon: LucideIcon;
};

export const ACCOUNT_TYPE_META: Record<AccountType, AccountTypeMeta> = {
  [AccountType.Checking]: { label: 'Checking', icon: Wallet },
  [AccountType.Savings]: { label: 'Savings', icon: PiggyBank },
  [AccountType.CreditCard]: { label: 'Credit card', icon: CreditCard },
  [AccountType.Cash]: { label: 'Cash', icon: Banknote },
  [AccountType.Investment]: { label: 'Investment', icon: TrendingUp },
  [AccountType.Loan]: { label: 'Loan', icon: Landmark },
};

export const ACCOUNT_TYPE_OPTIONS: AccountType[] = [
  AccountType.Checking,
  AccountType.Savings,
  AccountType.CreditCard,
  AccountType.Cash,
  AccountType.Investment,
  AccountType.Loan,
];
