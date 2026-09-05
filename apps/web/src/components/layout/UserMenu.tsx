import { LogOut, Monitor, Moon, Sun, User } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

import { Avatar } from '@/components/ui/avatar.js';
import { Button } from '@/components/ui/button.js';
import { DropdownMenu } from '@/components/ui/dropdown-menu.js';
import { useTheme } from '@/hooks/use-theme.js';
import { getInitials } from '@/lib/initials.js';
import { type MeOutput, useLogout } from '@/features/auth/gateways/auth.js';
import { cn } from '@/lib/utils.js';

type UserMenuProps = {
  user: MeOutput;
  className?: string;
  compact?: boolean;
};

export function UserMenu({ user, className, compact = false }: UserMenuProps) {
  const { theme, setTheme } = useTheme();
  const { mutate: logout, isPending } = useLogout();
  const navigate = useNavigate({ from: '/' });

  const displayName = user.name ?? user.email;
  const initials = getInitials(displayName);

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        navigate({ to: '/login' });
      },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger
        render={
          compact ? (
            <Button
              variant="ghost"
              size="icon"
              className={cn('min-h-11 min-w-11 rounded-full', className)}
              aria-label={`User menu for ${displayName}`}
            >
              <Avatar>
                <Avatar.Fallback className="text-foreground">{initials}</Avatar.Fallback>
              </Avatar>
            </Button>
          ) : (
            <Button
              variant="ghost"
              className={cn(
                'h-9 w-full justify-start gap-2 px-2 text-left font-normal',
                'group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0',
                className
              )}
              aria-label={`User menu for ${displayName}`}
            >
              <Avatar>
                <Avatar.Fallback className="text-foreground">{initials}</Avatar.Fallback>
              </Avatar>
              <span className="truncate group-data-[collapsible=icon]:hidden">{displayName}</span>
            </Button>
          )
        }
      />
      <DropdownMenu.Content align="end" className="w-56">
        <DropdownMenu.Group>
          <DropdownMenu.Label>{displayName}</DropdownMenu.Label>
          <DropdownMenu.Item disabled aria-disabled="true">
            <User className="mr-2 size-4" />
            Settings
          </DropdownMenu.Item>
        </DropdownMenu.Group>
        <DropdownMenu.Separator />
        <DropdownMenu.Group>
          <DropdownMenu.Label>Theme</DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={theme}
            onValueChange={(value) => setTheme(value as typeof theme)}
          >
            <DropdownMenu.RadioItem value="light">
              <Sun className="mr-2 size-4" />
              Light
            </DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="dark">
              <Moon className="mr-2 size-4" />
              Dark
            </DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="system">
              <Monitor className="mr-2 size-4" />
              System
            </DropdownMenu.RadioItem>
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Group>
        <DropdownMenu.Separator />
        <DropdownMenu.Item variant="destructive" disabled={isPending} onClick={handleLogout}>
          <LogOut className="mr-2 size-4" />
          Log out
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
