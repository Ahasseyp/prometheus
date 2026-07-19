import { CheckCircle2 } from 'lucide-react';

export function AuthStatusIcon() {
  return (
    <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-primary/10">
      <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
    </div>
  );
}
