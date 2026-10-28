import { useEffect, useMemo, useState } from 'react';

import { FormError } from '@/components/form/FormError.js';
import { Button } from '@/components/ui/button.js';
import { Card } from '@/components/ui/card.js';
import { Combobox } from '@/components/ui/combobox.js';
import { Label } from '@/components/ui/label.js';
import { Spinner } from '@/components/ui/spinner.js';
import { useUpdateReportingCurrency } from '@/features/household/gateways/household.js';
import {
  getCurrencyOptions,
  type CurrencyCode,
} from '@/features/household/lib/currency-options.js';

export interface ReportingCurrencyFormProps {
  reportingCurrency: string;
}

export function ReportingCurrencyForm({ reportingCurrency }: ReportingCurrencyFormProps) {
  const [selectedCurrency, setSelectedCurrency] = useState(reportingCurrency);
  const [formError, setFormError] = useState<string | null>(null);
  const { mutate, isPending } = useUpdateReportingCurrency();
  const options = useMemo(
    () =>
      getCurrencyOptions().map((option) => ({
        value: option.code,
        label: `${option.label} (${option.code})`,
      })),
    []
  );
  const selectedOption = options.find((option) => option.value === selectedCurrency) ?? null;

  useEffect(() => {
    setSelectedCurrency(reportingCurrency);
  }, [reportingCurrency]);

  function handleCurrencyChange(option: { value: string } | null) {
    setSelectedCurrency(option?.value ?? '');
    setFormError(null);
  }

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    mutate(
      { reportingCurrency: selectedCurrency as CurrencyCode },
      {
        onError: () => {
          setFormError('Unable to update Reporting Currency. Please try again.');
        },
      }
    );
  }

  return (
    <Card>
      <Card.Header>
        <Card.Title>Reporting Currency</Card.Title>
        <Card.Description>Used across all reports and totals.</Card.Description>
      </Card.Header>
      <Card.Content>
        <form className="flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={handleSubmit}>
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="reporting-currency">Reporting currency</Label>
            <Combobox
              items={options}
              value={selectedOption}
              onValueChange={handleCurrencyChange}
              itemToStringLabel={(option) => option.label}
              itemToStringValue={(option) => option.value}
              disabled={isPending}
              autoHighlight
            >
              <Combobox.Input id="reporting-currency" placeholder="Select a currency" />
              <Combobox.Content>
                <Combobox.List>
                  <Combobox.Collection>
                    {(option) => (
                      <Combobox.Item key={option.value} value={option}>
                        {option.label}
                      </Combobox.Item>
                    )}
                  </Combobox.Collection>
                </Combobox.List>
              </Combobox.Content>
            </Combobox>
            {formError && <FormError message={formError} />}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending || selectedCurrency === reportingCurrency}
              onClick={() => setSelectedCurrency(reportingCurrency)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || selectedCurrency === reportingCurrency}>
              {isPending ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </form>
      </Card.Content>
    </Card>
  );
}
