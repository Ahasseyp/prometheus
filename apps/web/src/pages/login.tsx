import { useNavigate } from '@tanstack/react-router';

import { CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card.js';
import { TextLink } from '@/components/molecules/TextLink/TextLink.js';
import { AuthCardShell } from '@/features/auth/components/AuthCardShell/AuthCardShell.js';
import { AuthHeading } from '@/features/auth/components/AuthHeading/AuthHeading.js';
import { LoginForm } from '@/features/auth/components/LoginForm/LoginForm.js';
import { isRegistrationEnabled } from '@/lib/env.js';

export interface LoginPageProps {
  onSuccess?: (user: { email: string }) => void;
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const navigate = useNavigate({ from: '/login' });
  const registrationEnabled = isRegistrationEnabled();

  function handleLoginSuccess(user: { email: string }) {
    onSuccess?.(user);
    navigate({ to: '/' });
  }

  return (
    <AuthCardShell>
      <CardHeader>
        <AuthHeading>Sign in to your account</AuthHeading>
        <CardDescription>Welcome back to Prometheus.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm onSuccess={handleLoginSuccess} />
      </CardContent>
      <CardFooter>
        {registrationEnabled && (
          <p className="text-sm text-muted-foreground">
            Don't have an account? <TextLink to="/register">Create one</TextLink>
          </p>
        )}
      </CardFooter>
    </AuthCardShell>
  );
}
