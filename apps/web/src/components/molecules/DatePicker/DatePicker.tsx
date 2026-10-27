import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button.js';
import { Calendar } from '@/components/ui/calendar.js';
import { Popover } from '@/components/ui/popover.js';

export interface DatePickerProps {
  value?: Date;
  onChange: (value: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  ...props
}: DatePickerProps) {
  return (
    <Popover>
      <Popover.Trigger
        aria-label={props['aria-label']}
        render={
          <Button
            variant="outline"
            data-empty={!value}
            disabled={props.disabled}
            className="w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground"
          />
        }
      >
        <CalendarIcon data-icon="inline-start" />
        {value ? format(value, 'PPP') : <span>{placeholder}</span>}
      </Popover.Trigger>
      <Popover.Content className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} />
      </Popover.Content>
    </Popover>
  );
}
