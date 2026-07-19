import { Link } from '@tanstack/react-router';
import { type VariantProps } from 'class-variance-authority';

import { buttonVariants } from '@/components/ui/button.js';
import { cn } from '@/lib/utils.js';

export type ButtonLinkProps = React.ComponentProps<typeof Link> &
  VariantProps<typeof buttonVariants>;

export function ButtonLink({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonLinkProps) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
