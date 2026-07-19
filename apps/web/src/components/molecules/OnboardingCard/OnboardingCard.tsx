import { ButtonLink } from '@/components/molecules/ButtonLink/ButtonLink.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.js';
import { isRegistrationEnabled } from '@/lib/env.js';

export function OnboardingCard() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <span className="font-heading text-xl font-semibold">P</span>
        </div>
        <CardTitle className="font-heading text-2xl">Your money, clearly.</CardTitle>
        <CardDescription>
          Prometheus tracks spending, budgets, and goals without the noise.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <ButtonLink to="/login" size="lg" className="w-full">
            Sign in
          </ButtonLink>
          {isRegistrationEnabled() && (
            <ButtonLink to="/register" variant="outline" size="lg" className="w-full">
              Create account
            </ButtonLink>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
