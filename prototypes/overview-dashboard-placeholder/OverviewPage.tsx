import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CreditCard,
  PiggyBank,
  Plus,
  Receipt,
  Target,
  Wallet,
} from 'lucide-react';

import { Button } from '@/components/ui/button.js';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.js';
import { useAuthHouseholdState } from '@/features/auth/hooks/useAuthHouseholdState.js';
import { cn } from '@/lib/utils.js';

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const MOCK_ACCOUNTS = [
  { id: '1', name: 'Checking', balance: 4820.35, type: 'checking' },
  { id: '2', name: 'Savings', balance: 12750.0, type: 'savings' },
  { id: '3', name: 'Credit Card', balance: -1240.5, type: 'credit' },
];

const MOCK_TRANSACTIONS = [
  { id: 't1', name: 'Grocery store', date: 'Today', amount: -84.2, category: 'Food' },
  { id: 't2', name: 'Salary deposit', date: 'Yesterday', amount: 3250.0, category: 'Income' },
  { id: 't3', name: 'Electric bill', date: 'Yesterday', amount: -112.45, category: 'Utilities' },
  { id: 't4', name: 'Coffee shop', date: 'Jul 20', amount: -5.5, category: 'Food' },
  { id: 't5', name: 'Gym membership', date: 'Jul 18', amount: -49.99, category: 'Health' },
];

const MOCK_BUDGETS = [
  { id: 'b1', name: 'Food', spent: 420, limit: 600 },
  { id: 'b2', name: 'Utilities', spent: 180, limit: 250 },
  { id: 'b3', name: 'Entertainment', spent: 210, limit: 200 },
];

function formatCurrency(value: number) {
  return formatter.format(value);
}

function getTotalBalance() {
  return MOCK_ACCOUNTS.reduce((sum, account) => sum + account.balance, 0);
}

function getMonthlyChange() {
  return 324.81;
}

function getBudgetHealth(budget: (typeof MOCK_BUDGETS)[number]) {
  const ratio = budget.spent / budget.limit;
  if (ratio > 1) return { label: 'Over', tone: 'destructive' as const };
  if (ratio > 0.85) return { label: 'Close', tone: 'warning' as const };
  return { label: 'On track', tone: 'success' as const };
}

type Tone = 'success' | 'warning' | 'destructive';

function toneClass(tone: Tone) {
  return {
    success: 'text-primary',
    warning: 'text-amber-600 dark:text-amber-400',
    destructive: 'text-destructive',
  }[tone];
}

export function OverviewPage() {
  const { household } = useAuthHouseholdState();
  const totalBalance = getTotalBalance();
  const monthlyChange = getMonthlyChange();
  const isPositive = monthlyChange >= 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {household?.name ?? 'Personal'} overview
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline">
            <Receipt className="mr-2 size-4" />
            Add transaction
          </Button>
          <Button size="sm">
            <Plus className="mr-2 size-4" />
            Ask assistant
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-card glow-internal lg:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription>Total balance</CardDescription>
            <CardTitle className="text-3xl font-semibold">{formatCurrency(totalBalance)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <span
                className={cn(
                  'flex items-center',
                  isPositive ? 'text-primary' : 'text-destructive'
                )}
              >
                {isPositive ? (
                  <ArrowUpRight className="size-4" />
                ) : (
                  <ArrowDownRight className="size-4" />
                )}
                {formatCurrency(Math.abs(monthlyChange))}
              </span>
              this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Accounts</CardDescription>
            <CardTitle className="text-3xl font-semibold">{MOCK_ACCOUNTS.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(totalBalance)} across all accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Monthly spending</CardDescription>
            <CardTitle className="text-3xl font-semibold">{formatCurrency(1240.5)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{formatCurrency(260)} under last month</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-muted-foreground" />
              <CardTitle>Accounts</CardTitle>
            </div>
            <CardDescription>Your connected accounts and balances</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {MOCK_ACCOUNTS.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    {account.type === 'credit' ? (
                      <CreditCard className="size-4" />
                    ) : (
                      <Banknote className="size-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{account.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{account.type}</p>
                  </div>
                </div>
                <p
                  className={cn(
                    'text-sm font-semibold',
                    account.balance < 0 ? 'text-destructive' : 'text-foreground'
                  )}
                >
                  {formatCurrency(account.balance)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PiggyBank className="size-4 text-muted-foreground" />
              <CardTitle>Budgets</CardTitle>
            </div>
            <CardDescription>Progress this month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {MOCK_BUDGETS.map((budget) => {
              const health = getBudgetHealth(budget);
              const percentage = Math.min(100, Math.round((budget.spent / budget.limit) * 100));

              return (
                <div key={budget.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{budget.name}</span>
                    <span className={cn('text-xs font-medium', toneClass(health.tone))}>
                      {health.label}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        health.tone === 'success' && 'bg-primary',
                        health.tone === 'warning' && 'bg-amber-500',
                        health.tone === 'destructive' && 'bg-destructive'
                      )}
                      style={{ width: `${percentage}%` }}
                      aria-label={`${budget.name} budget ${percentage}% used`}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(budget.spent)} of {formatCurrency(budget.limit)}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardAction>
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </CardAction>
            <div className="flex items-center gap-2">
              <Receipt className="size-4 text-muted-foreground" />
              <CardTitle>Recent transactions</CardTitle>
            </div>
            <CardDescription>Latest activity across your accounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {MOCK_TRANSACTIONS.map((transaction) => {
              const isIncome = transaction.amount > 0;

              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-medium">{transaction.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.date} · {transaction.category}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      isIncome ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {isIncome ? '+' : ''}
                    {formatCurrency(transaction.amount)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="size-4 text-muted-foreground" />
              <CardTitle>Goals</CardTitle>
            </div>
            <CardDescription>Targets you are working toward</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Emergency fund</span>
                <span className="text-xs text-muted-foreground">68%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[68%] rounded-full bg-primary" />
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(10200)} of {formatCurrency(15000)}
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Vacation</span>
                <span className="text-xs text-muted-foreground">32%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[32%] rounded-full bg-primary" />
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(1600)} of {formatCurrency(5000)}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
