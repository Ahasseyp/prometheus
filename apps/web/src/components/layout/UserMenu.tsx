import { LogOut, Monitor, Moon, Sun, User } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

import { Avatar, AvatarFallback } from '@/components/ui/avatar.js';
import { Button } from '@/components/ui/button.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.js';
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
      <DropdownMenuTrigger
        render={
          compact ? (
            <Button
              variant="ghost"
              size="icon"
              className={cn('min-h-11 min-w-11 rounded-full', className)}
              aria-label={`User menu for ${displayName}`}
            >
              <Avatar>
                <AvatarFallback className="text-foreground">{initials}</AvatarFallback>
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
                <AvatarFallback className="text-foreground">{initials}</AvatarFallback>
              </Avatar>
              <span className="truncate group-data-[collapsible=icon]:hidden">{displayName}</span>
            </Button>
          )
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
          <DropdownMenuItem disabled aria-disabled="true">
            <User className="mr-2 size-4" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(value) => setTheme(value as typeof theme)}
          >
            <DropdownMenuRadioItem value="light">
              <Sun className="mr-2 size-4" />
              Light
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <Moon className="mr-2 size-4" />
              Dark
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">
              <Monitor className="mr-2 size-4" />
              System
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={isPending} onClick={handleLogout}>
          <LogOut className="mr-2 size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
