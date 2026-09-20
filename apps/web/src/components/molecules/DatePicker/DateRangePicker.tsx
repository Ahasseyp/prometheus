import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button.js';
import { Calendar } from '@/components/ui/calendar.js';
import { Popover } from '@/components/ui/popover.js';

export interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (value: DateRange | undefined) => void;
  placeholder?: string;
  'aria-label'?: string;
}

function formatRange(range: DateRange | undefined): string | null {
  if (range?.from === undefined) {
    return null;
  }
  if (range.to === undefined) {
    return format(range.from, 'LLL dd, y');
  }
  return `${format(range.from, 'LLL dd, y')} – ${format(range.to, 'LLL dd, y')}`;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Pick a date range',
  ...props
}: DateRangePickerProps) {
  const label = formatRange(value);

  return (
    <Popover>
      <Popover.Trigger
        aria-label={props['aria-label']}
        render={
          <Button
            variant="outline"
            data-empty={label === null}
            className="w-auto justify-start text-left font-normal data-[empty=true]:text-muted-foreground"
          />
        }
      >
        <CalendarIcon data-icon="inline-start" />
        {label ?? <span>{placeholder}</span>}
      </Popover.Trigger>
      <Popover.Content className="w-auto p-0">
        <Calendar mode="range" selected={value} onSelect={onChange} />
      </Popover.Content>
    </Popover>
  );
}
