import { Coins } from 'lucide-react';

import { Button } from '@/components/ui/button.js';

import type { Goal } from '@/features/goals/gateways/goals.js';

export interface ContributeButtonProps {
  goal: Goal;
  onClick: (goal: Goal) => void;
}

// Contributing is the primary thing you do with a Goal, so it stays a
// visible button rather than hiding in the overflow menu.
export function ContributeButton({ goal, onClick }: ContributeButtonProps) {
  return (
    <Button variant="outline" size="sm" onClick={() => onClick(goal)}>
      <Coins data-icon="inline-start" aria-hidden="true" />
      Contribute
    </Button>
  );
}
