import * as React from 'react';

import { SidebarMenuButton } from '@/components/ui/sidebar.js';
import { cn } from '@/lib/utils.js';

type AppSidebarMenuButtonProps = React.ComponentProps<typeof SidebarMenuButton>;

export function AppSidebarMenuButton({ className, children, ...props }: AppSidebarMenuButtonProps) {
  return (
    <SidebarMenuButton
      className={cn(
        'relative overflow-hidden',
        'data-active:bg-primary data-active:text-primary-foreground',
        'data-active:shadow-(--shadow-sidebar-active)',
        'data-active:hover:bg-primary data-active:hover:text-primary-foreground data-active:hover:brightness-105 data-active:hover:shadow-[var(--shadow-sidebar-active-hover)]',
        'data-active:before:absolute data-active:before:inset-0 data-active:before:bg-gradient-button data-active:before:opacity-40 data-active:hover:before:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </SidebarMenuButton>
  );
}
