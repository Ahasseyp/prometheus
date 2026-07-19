import { cn } from '@/lib/utils.js';

export type AuthHeadingProps = React.ComponentProps<'h1'>;

export function AuthHeading({ className, ...props }: AuthHeadingProps) {
  return (
    <h1 className={cn('font-heading text-xl font-semibold leading-snug', className)} {...props} />
  );
}
