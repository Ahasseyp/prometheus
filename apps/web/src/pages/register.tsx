import { useState } from 'react';

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
import { AuthStatusIcon } from '@/features/auth/components/AuthStatusIcon/AuthStatusIcon.js';
import { RegisterForm } from '@/features/auth/components/RegisterForm/RegisterForm.js';
import { isRegistrationEnabled } from '@/lib/env.js';

export function RegisterPage({ isEnabled }: { isEnabled?: boolean } = {}) {
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const registrationEnabled = isEnabled ?? isRegistrationEnabled();

  function handleRegisterSuccess(email: string) {
    setRegisteredEmail(email);
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

  if (registeredEmail) {
    return (
      <AuthCardShell>
        <CardHeader>
          <AuthStatusIcon />
          <AuthHeading>Account created</AuthHeading>
          <CardDescription>
            We've created an account for{' '}
            <span className="font-medium text-foreground">{registeredEmail}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ButtonLink to="/login" className="w-full">
            Sign in
          </ButtonLink>
        </CardContent>
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
