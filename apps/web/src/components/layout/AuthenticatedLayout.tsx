import * as React from 'react';
import { Link, Outlet, useMatches, useNavigate } from '@tanstack/react-router';

import { Button } from '@/components/ui/button.js';
import { Skeleton } from '@/components/ui/skeleton.js';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar.js';
import { useMe } from '@/features/auth/gateways/auth.js';
import { useHouseholdMe } from '@/features/household/gateways/household.js';

import { AppSidebar } from './AppSidebar.js';
import { AssistantDialog } from './AssistantDialog.js';
import { MobileNav } from './MobileNav.js';
import { UserMenu } from './UserMenu.js';

function useRouteTitle(): string {
  const matches = useMatches();
  const match = matches[matches.length - 1];
  const staticData = match?.staticData as { title?: string } | undefined;
  return staticData?.title ?? '';
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
      <Skeleton className="size-12 rounded-xl" />
      <Skeleton className="h-5 w-40" />
    </div>
  );
}

export function AuthenticatedLayout() {
  const { data: user, isLoading: isAuthLoading } = useMe();
  const { data: householdData } = useHouseholdMe();
  const navigate = useNavigate({ from: '/' });
  const [assistantOpen, setAssistantOpen] = React.useState(false);
  const pageTitle = useRouteTitle();

  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      navigate({ to: '/login' });
    }
  }, [isAuthLoading, user, navigate]);

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setAssistantOpen((open) => !open);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isAuthLoading || !user) {
    return <ShellSkeleton />;
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} household={householdData?.household} />
      <SidebarInset className="max-md:pb-20">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b px-4 py-3 md:hidden">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-semibold"
            aria-label="Prometheus home"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-foreground">
              P
            </span>
            Prometheus
          </Link>
          <div className="flex items-center gap-1">
            <UserMenu user={user} compact />
          </div>
        </header>

        {/* Desktop header */}
        <header className="hidden items-center gap-4 border-b px-4 py-3 md:flex">
          <SidebarTrigger />
          <h1 className="flex-1 text-base font-semibold">{pageTitle}</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssistantOpen(true)}
              aria-label="Open assistant"
            >
              Ask or do anything
              <kbd className="pointer-events-none hidden rounded border bg-muted px-1.5 py-0.5 text-xs font-medium tracking-widest text-muted-foreground sm:inline-block">
                ⌘K
              </kbd>
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
      <MobileNav onOpenAssistant={() => setAssistantOpen(true)} />
      <AssistantDialog open={assistantOpen} onOpenChange={setAssistantOpen} />
    </SidebarProvider>
  );
}
