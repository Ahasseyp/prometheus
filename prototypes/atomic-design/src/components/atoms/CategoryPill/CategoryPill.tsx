import { cn } from '~/lib/utils';

export interface CategoryPillProps {
  name: string;
  color?: string;
  className?: string;
}

export function CategoryPill({ name, color = '#71717a', className }: CategoryPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        className,
      )}
      style={{
        backgroundColor: `${color}20`,
        color,
      }}
    >
      {name}
    </span>
  );
}
