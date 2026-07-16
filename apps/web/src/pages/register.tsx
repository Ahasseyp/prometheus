import { useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.js';
import { RegisterForm } from '@/features/auth/components/RegisterForm/index.js';
import { isRegistrationEnabled } from '@/lib/env.js';
import { cn } from '@/lib/utils.js';

export function RegisterPage({ isEnabled }: { isEnabled?: boolean } = {}) {
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const registrationEnabled = isEnabled ?? isRegistrationEnabled();

  function handleRegisterSuccess(email: string) {
    setRegisteredEmail(email);
  }

  if (!registrationEnabled) {
    return (
      <RegisterLayout>
        <CardHeader>
          <CardTitle>Registration unavailable</CardTitle>
          <CardDescription>
            New account creation is currently disabled on this server.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link to="/" className={cn(buttonVariants({ variant: 'ghost' }), 'gap-2 px-0')}>
            <ArrowLeft className="size-4" />
            Back to home
          </Link>
        </CardFooter>
      </RegisterLayout>
    );
  }

  if (registeredEmail) {
    return (
      <RegisterLayout>
        <CardHeader>
          <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
          </div>
          <h1 className="font-heading text-xl font-semibold leading-snug">Account created</h1>
          <CardDescription>
            We've created an account for{' '}
            <span className="font-medium text-foreground">{registeredEmail}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/" className={cn(buttonVariants(), 'w-full')}>
            Back to home
          </Link>
        </CardContent>
      </RegisterLayout>
    );
  }

  return (
    <RegisterLayout>
      <CardHeader>
        <h1 className="font-heading text-xl font-semibold leading-snug">Create your account</h1>
        <CardDescription>Start tracking your money with Prometheus.</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm onSuccess={handleRegisterSuccess} />
      </CardContent>
      <CardFooter className="flex-col items-start gap-3">
        <Link to="/" className={cn(buttonVariants({ variant: 'ghost' }), 'gap-2 px-0')}>
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </RegisterLayout>
  );
}

function RegisterLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center p-6">
      <Card className="w-full max-w-sm">{children}</Card>
    </main>
  );
}
