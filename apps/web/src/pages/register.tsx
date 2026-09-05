import { useNavigate } from '@tanstack/react-router';

import { Card } from '@/components/ui/card.js';
import { ButtonLink } from '@/components/molecules/ButtonLink/ButtonLink.js';
import { TextLink } from '@/components/molecules/TextLink/TextLink.js';
import { AuthCardShell } from '@/features/auth/components/AuthCardShell/AuthCardShell.js';
import { AuthHeading } from '@/features/auth/components/AuthHeading/AuthHeading.js';
import { RegisterForm } from '@/features/auth/components/RegisterForm/RegisterForm.js';
import { isRegistrationEnabled } from '@/lib/env.js';

export interface RegisterPageProps {
  isEnabled?: boolean;
  onSuccess?: () => void;
}

export function RegisterPage({ isEnabled, onSuccess }: RegisterPageProps) {
  const navigate = useNavigate({ from: '/register' });
  const registrationEnabled = isEnabled ?? isRegistrationEnabled();

  function handleRegisterSuccess() {
    onSuccess?.();
    navigate({ to: '/' });
  }

  if (!registrationEnabled) {
    return (
      <AuthCardShell>
        <Card.Header>
          <Card.Title>Registration unavailable</Card.Title>
          <Card.Description>
            New account creation is currently disabled on this server.
          </Card.Description>
        </Card.Header>
        <Card.Footer>
          <ButtonLink to="/login" variant="ghost" className="px-0">
            Sign in
          </ButtonLink>
        </Card.Footer>
      </AuthCardShell>
    );
  }

  return (
    <AuthCardShell>
      <Card.Header>
        <AuthHeading>Create your account</AuthHeading>
        <Card.Description>Start tracking your money with Prometheus.</Card.Description>
      </Card.Header>
      <Card.Content>
        <RegisterForm onSuccess={handleRegisterSuccess} />
      </Card.Content>
      <Card.Footer>
        <p className="text-sm text-muted-foreground">
          Already have an account? <TextLink to="/login">Sign in</TextLink>
        </p>
      </Card.Footer>
    </AuthCardShell>
  );
}
