import { Button } from '@/components/ui/button.js';
import { CardContent, CardDescription, CardHeader } from '@/components/ui/card.js';
import { AuthCardShell } from '@/features/auth/components/AuthCardShell/AuthCardShell.js';
import { AuthHeading } from '@/features/auth/components/AuthHeading/AuthHeading.js';
import { CreateHouseholdForm } from '@/features/household/components/CreateHouseholdForm/CreateHouseholdForm.js';

export interface CreateHouseholdCardProps {
  onBackToLogin?: () => void;
  isBackToLoginPending?: boolean;
}

export function CreateHouseholdCard({
  onBackToLogin,
  isBackToLoginPending,
}: CreateHouseholdCardProps) {
  return (
    <AuthCardShell>
      <CardHeader>
        <AuthHeading>Create your household</AuthHeading>
        <CardDescription>
          Name your household and choose the currency for budgets, goals, and totals.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <CreateHouseholdForm />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isBackToLoginPending}
          onClick={onBackToLogin}
        >
          {isBackToLoginPending ? 'Going back…' : 'Go back to login'}
        </Button>
      </CardContent>
    </AuthCardShell>
  );
}
