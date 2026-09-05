import { Plus, Wallet } from 'lucide-react';

import { Button } from '@/components/ui/button.js';
import { Empty } from '@/components/ui/empty.js';
import { ButtonLink } from '@/components/molecules/ButtonLink/ButtonLink.js';

export interface AccountsEmptyStateProps {
  onAddAccount?: () => void;
}

export function AccountsEmptyState({ onAddAccount }: AccountsEmptyStateProps) {
  return (
    <Empty>
      <Empty.Header>
        <Empty.Media variant="icon">
          <Wallet aria-hidden="true" />
        </Empty.Media>
        <Empty.Title>Add your first account</Empty.Title>
        <Empty.Description>
          Accounts are where your money lives — checking, savings, credit cards, cash and more. Add
          one to start tracking balances.
        </Empty.Description>
      </Empty.Header>
      <Empty.Content>
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
      </Empty.Content>
    </Empty>
  );
}
