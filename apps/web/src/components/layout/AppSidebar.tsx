import { ArrowLeftRight, LayoutDashboard, PiggyBank, Target, Wallet } from 'lucide-react';
import { useLocation, useNavigate } from '@tanstack/react-router';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar.js';
import { UserMenu } from './UserMenu.js';
import { type MeOutput } from '@/features/auth/gateways/auth.js';
import { type HouseholdMeOutput } from '@/features/household/gateways/household.js';
import { cn } from '@/lib/utils.js';

type AppSidebarProps = {
  user: MeOutput;
  household: HouseholdMeOutput['household'] | undefined;
};

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/goals', label: 'Goals', icon: Target },
];

export function AppSidebar({ user, household }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate({ from: '/' });

  return (
    <Sidebar collapsible="icon" variant="inset" aria-label="Main navigation">
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-foreground">
            <span className="font-heading text-sm font-semibold">P</span>
          </div>
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">Prometheus</span>
            <span className="truncate text-xs text-muted-foreground">
              {household?.name ?? 'Personal'}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Finance</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;

                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      isActive={isActive}
                      aria-current={isActive ? 'page' : undefined}
                      tooltip={item.label}
                      onClick={() => navigate({ to: item.to })}
                      className={cn(
                        'data-active:bg-primary data-active:text-primary-foreground data-active:hover:bg-primary/90'
                      )}
                    >
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UserMenu user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
