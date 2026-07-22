import { useMe, type MeOutput } from '@/features/auth/gateways/auth.js';
import { useHouseholdMe, type HouseholdMeOutput } from '@/features/household/gateways/household.js';

export type AuthHouseholdState =
  | { isLoading: true; user: undefined; household: undefined }
  | {
      isLoading: false;
      user: MeOutput | null;
      household: HouseholdMeOutput['household'] | null;
    };

export function useAuthHouseholdState(): AuthHouseholdState {
  const { data: user, isLoading: isAuthLoading } = useMe();
  const { data: householdData, isLoading: isHouseholdLoading } = useHouseholdMe();

  if (isAuthLoading || isHouseholdLoading) {
    return { isLoading: true, user: undefined, household: undefined };
  }

  return {
    isLoading: false,
    user: user ?? null,
    household: householdData?.household ?? null,
  };
}
