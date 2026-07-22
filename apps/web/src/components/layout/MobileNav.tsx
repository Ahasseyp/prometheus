import { ArrowLeftRight, Bot, LayoutDashboard, PiggyBank, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, useLocation } from '@tanstack/react-router';

import { Button } from '@/components/ui/button.js';
import { cn } from '@/lib/utils.js';

type MobileNavProps = {
  onOpenAssistant: () => void;
};

type MobileNavItemProps = {
  to: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
};

const tabs = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/goals', label: 'Goals', icon: Target },
];

function MobileNavItem({ to, icon: Icon, label, isActive }: MobileNavItemProps) {
  return (
    <li className="flex-1">
      <Link
        to={to}
        aria-label={label}
        className={cn(
          'flex items-center justify-center rounded-lg transition-colors',
          'min-h-12 min-w-12 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isActive && 'text-primary'
        )}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon className="size-5" aria-hidden="true" />
      </Link>
    </li>
  );
}

export function MobileNav({ onOpenAssistant }: MobileNavProps) {
  const location = useLocation();

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex h-16 items-center justify-around px-2">
        {tabs.slice(0, 2).map((item) => (
          <MobileNavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            isActive={location.pathname === item.to}
          />
        ))}
        <li className="flex-1">
          <Button
            variant="default"
            size="icon"
            className="mx-auto flex size-12 items-center justify-center rounded-full shadow-sm"
            aria-label="Open assistant"
            onClick={onOpenAssistant}
          >
            <Bot className="size-5" aria-hidden="true" />
          </Button>
        </li>
        {tabs.slice(2).map((item) => (
          <MobileNavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            isActive={location.pathname === item.to}
          />
        ))}
      </ul>
    </nav>
  );
}
