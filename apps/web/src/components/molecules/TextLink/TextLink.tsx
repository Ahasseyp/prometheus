import { Link } from '@tanstack/react-router';

import { cn } from '@/lib/utils.js';

export type TextLinkProps = React.ComponentProps<typeof Link>;

export function TextLink({ className, ...props }: TextLinkProps) {
  return (
    <Link
      className={cn('font-medium text-foreground underline-offset-4 hover:underline', className)}
      {...props}
    />
  );
}
