import { useState } from 'react';

import { CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card.js';
import { ButtonLink } from '@/components/molecules/ButtonLink/ButtonLink.js';
import { TextLink } from '@/components/molecules/TextLink/TextLink.js';
import { AuthCardShell } from '@/features/auth/components/AuthCardShell/AuthCardShell.js';
import { AuthHeading } from '@/features/auth/components/AuthHeading/AuthHeading.js';
import { AuthStatusIcon } from '@/features/auth/components/AuthStatusIcon/AuthStatusIcon.js';
import { LoginForm } from '@/features/auth/components/LoginForm/LoginForm.js';
import { isRegistrationEnabled } from '@/lib/env.js';

export function LoginPage() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);

  function handleLoginSuccess(user: { email: string }) {
    setSignedInEmail(user.email);
    setIsSignedIn(true);
  }

  if (isSignedIn) {
    return (
      <AuthCardShell>
        <CardHeader>
          <AuthStatusIcon />
          <AuthHeading>You're signed in</AuthHeading>
          <CardDescription>
            Welcome back, <span className="font-medium text-foreground">{signedInEmail}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ButtonLink to="/" className="w-full">
            Go to home
          </ButtonLink>
        </CardContent>
      </AuthCardShell>
    );
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
        {isRegistrationEnabled() && (
          <p className="text-sm text-muted-foreground">
            Don't have an account? <TextLink to="/register">Create one</TextLink>
          </p>
        )}
      </CardFooter>
    </AuthCardShell>
  );
}
