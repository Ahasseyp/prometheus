import { Plus, Wallet } from 'lucide-react';

import { Button } from '@/components/ui/button.js';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty.js';
import { ButtonLink } from '@/components/molecules/ButtonLink/ButtonLink.js';

export interface AccountsEmptyStateProps {
  onAddAccount?: () => void;
}

export function AccountsEmptyState({ onAddAccount }: AccountsEmptyStateProps) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Wallet aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>Add your first account</EmptyTitle>
        <EmptyDescription>
          Accounts are where your money lives — checking, savings, credit cards, cash and more. Add
          one to start tracking balances.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {onAddAccount ? (
          <Button onClick={onAddAccount}>
            <Plus data-icon="inline-start" />
            Add account
          </Button>
        ) : (
          <ButtonLink to="/accounts">
            <Plus data-icon="inline-start" />
            Add an account
          </ButtonLink>
        )}
      </EmptyContent>
    </Empty>
  );
}
