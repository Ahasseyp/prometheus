import crypto from 'node:crypto';

import {
  createHousehold as createHouseholdEntity,
  HouseholdMembershipRole,
  makeHouseholdId,
} from '@prometheus/domain';
import type { HouseholdMembershipRole as HouseholdMembershipRoleType } from '@prometheus/domain';

import { Prisma } from '@prisma/client';

import { getPrisma } from '../prisma.js';

export type CreateHouseholdInput = {
  name: string;
  reportingCurrency: string;
};

type CreateHouseholdSuccess = {
  ok: true;
  household: {
    id: string;
    name: string;
    reportingCurrency: string;
  };
};

export const USER_ALREADY_HAS_HOUSEHOLD_ERROR = 'user-already-has-household' as const;

type CreateHouseholdFailure = {
  ok: false;
  error: typeof USER_ALREADY_HAS_HOUSEHOLD_ERROR;
};

export type CreateHouseholdResult = CreateHouseholdSuccess | CreateHouseholdFailure;

export type HouseholdContext = {
  id: string;
  name: string;
  reportingCurrency: string;
  role: HouseholdMembershipRoleType;
};

export type MembershipWithHousehold = Prisma.HouseholdMembershipGetPayload<{
  include: { household: true };
}>;

export function mapMembershipToHouseholdContext(
  membership: MembershipWithHousehold
): HouseholdContext {
  return {
    id: membership.household.id,
    name: membership.household.name,
    reportingCurrency: membership.household.reportingCurrency,
    role: membership.role,
  };
}

export async function findActiveHouseholdForUser(userId: string): Promise<HouseholdContext | null> {
  const prisma = getPrisma();
  const membership = await prisma.householdMembership.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: { household: true },
  });

  if (membership === null) {
    return null;
  }

  return mapMembershipToHouseholdContext(membership);
}

export async function createHousehold(
  input: CreateHouseholdInput,
  userId: string
): Promise<CreateHouseholdResult> {
  const householdResult = createHouseholdEntity({
    id: makeHouseholdId(crypto.randomUUID()),
    name: input.name,
    reportingCurrency: input.reportingCurrency,
  });

  if (!householdResult.ok) {
    // The API layer already validates name and currency, so reaching this
    // branch means a caller bypassed the tRPC input schema.
    throw new Error(`Unexpected household validation failure: ${householdResult.error.type}`);
  }

  const validatedHousehold = householdResult.value;
  const prisma = getPrisma();

  try {
    return await prisma.$transaction(async (tx) => {
      const existingMembership = await tx.householdMembership.findFirst({
        where: { userId },
      });

      if (existingMembership !== null) {
        return { ok: false, error: USER_ALREADY_HAS_HOUSEHOLD_ERROR };
      }

      const household = await tx.household.create({
        data: {
          id: validatedHousehold.id,
          name: validatedHousehold.name,
          reportingCurrency: validatedHousehold.reportingCurrency,
          memberships: {
            create: {
              userId,
              role: HouseholdMembershipRole.Owner,
            },
          },
        },
      });

      return {
        ok: true,
        household: {
          id: household.id,
          name: household.name,
          reportingCurrency: household.reportingCurrency,
        },
      };
    });
  } catch (error) {
    // The unique partial index on (userId) WHERE role = 'OWNER' turns a race
    // between two concurrent createHousehold calls into P2002.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { ok: false, error: USER_ALREADY_HAS_HOUSEHOLD_ERROR };
    }
    throw error;
  }
}
