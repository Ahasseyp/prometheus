import { InputGroup } from '@/components/ui/input-group.js';

export interface AmountInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  'aria-invalid': boolean;
  disabled: boolean;
  currency?: string;
  placeholder?: string;
}

function getCurrencySymbol(currency: string): string {
  const parts = new Intl.NumberFormat(undefined, { style: 'currency', currency }).formatToParts(1);
  return parts.find((part) => part.type === 'currency')?.value ?? currency;
}

// Amount entry with the currency framing the value, like the money inputs in
// the shadcn InputGroup docs. The currency comes from the account the amount
// belongs to; without one the add-ons stay hidden.
export function AmountInput({ currency, placeholder = '0.00', ...props }: AmountInputProps) {
  return (
    <InputGroup data-disabled={props.disabled} aria-invalid={props['aria-invalid']}>
      {currency !== undefined && (
        <InputGroup.Addon>
          <InputGroup.Text>{getCurrencySymbol(currency)}</InputGroup.Text>
        </InputGroup.Addon>
      )}
      <InputGroup.Input
        {...props}
        autoComplete="off"
        inputMode="decimal"
        placeholder={placeholder}
        onChange={(event) => props.onChange(event.target.value)}
      />
      {currency !== undefined && (
        <InputGroup.Addon align="inline-end">
          <InputGroup.Text>{currency}</InputGroup.Text>
        </InputGroup.Addon>
      )}
    </InputGroup>
  );
}
