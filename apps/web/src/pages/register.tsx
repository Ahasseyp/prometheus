import { useNavigate } from '@tanstack/react-router';

import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.js';
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
        <CardHeader>
          <CardTitle>Registration unavailable</CardTitle>
          <CardDescription>
            New account creation is currently disabled on this server.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <ButtonLink to="/login" variant="ghost" className="px-0">
            Sign in
          </ButtonLink>
        </CardFooter>
      </AuthCardShell>
    );
  }

  return (
    <AuthCardShell>
      <CardHeader>
        <AuthHeading>Create your account</AuthHeading>
        <CardDescription>Start tracking your money with Prometheus.</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm onSuccess={handleRegisterSuccess} />
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          Already have an account? <TextLink to="/login">Sign in</TextLink>
        </p>
      </CardFooter>
    </AuthCardShell>
  );
}
