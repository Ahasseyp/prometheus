import crypto from 'node:crypto';

import {
  createCategory as createCategoryEntity,
  makeCategoryId,
  makeHouseholdId,
  TransactionType,
} from '@prometheus/domain';
import type { TransactionType as DomainTransactionType } from '@prometheus/domain';
import { Prisma } from '@prisma/client';
import type { Category } from '@prisma/client';

import { getPrisma } from '../prisma.js';
import { mapDomainTransactionType, mapPrismaTransactionType } from '../lib/transaction-type.js';

export type CreateCategoryInput = {
  name: string;
  type: DomainTransactionType;
  parentId?: string;
  icon?: string | null;
};

export type UpdateCategoryInput = {
  name?: string;
  icon?: string | null;
};

export type CategoryRecord = {
  id: string;
  householdId: string;
  name: string;
  type: DomainTransactionType;
  isSystem: boolean;
  parentId: string | null;
  icon: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateCategoryResult =
  | { ok: true; category: CategoryRecord }
  | {
      ok: false;
      error: 'parent-not-found' | 'parent-is-subcategory' | 'type-mismatch' | 'invalid-data';
    };

export type DeleteCategoryResult =
  | { ok: true }
  | {
      ok: false;
      error: 'not-found' | 'system-category' | 'has-subcategories' | 'has-transactions';
    };

// See apps/api/src/services/account.ts: the tRPC layer validates first.
function unexpectedValidationError(reason: string): Error {
  return new Error(`Unexpected category validation failure: ${reason}`);
}

function mapCategoryToRecord(category: Category): CategoryRecord {
  return {
    id: category.id,
    householdId: category.householdId,
    name: category.name,
    type: mapPrismaTransactionType(category.type),
    isSystem: category.isSystem,
    parentId: category.parentId,
    icon: category.icon,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

type SystemCategorySeed = {
  name: string;
  icon: string;
  subcategories?: Array<{ name: string; icon: string }>;
};

const SYSTEM_CATEGORY_SEEDS: ReadonlyArray<{
  type: DomainTransactionType;
  categories: SystemCategorySeed[];
}> = [
  {
    type: TransactionType.Income,
    categories: [
      { name: 'Salary', icon: 'banknote-arrow-up' },
      { name: 'Freelance', icon: 'laptop' },
      { name: 'Interest', icon: 'percent' },
      { name: 'Other Income', icon: 'piggy-bank' },
    ],
  },
  {
    type: TransactionType.Expense,
    categories: [
      { name: 'Groceries', icon: 'shopping-cart' },
      { name: 'Rent', icon: 'home' },
      {
        name: 'Utilities',
        icon: 'lightbulb',
        subcategories: [
          { name: 'Electricity', icon: 'zap' },
          { name: 'Internet', icon: 'wifi' },
        ],
      },
      {
        name: 'Transport',
        icon: 'car',
        subcategories: [
          { name: 'Fuel', icon: 'fuel' },
          { name: 'Public Transit', icon: 'bus' },
        ],
      },
      { name: 'Dining', icon: 'utensils' },
      { name: 'Entertainment', icon: 'clapperboard' },
      { name: 'Health', icon: 'heart-pulse' },
      { name: 'Other Expense', icon: 'banknote-arrow-down' },
    ],
  },
];

/**
 * Seeds the standard System Categories for a new Household. Called inside the
 * household-creation transaction so a Household is never left without them
 * (issue #24). Households created before this feature are not backfilled.
 */
export async function seedSystemCategories(
  householdId: string,
  tx: Prisma.TransactionClient
): Promise<void> {
  for (const group of SYSTEM_CATEGORY_SEEDS) {
    for (const seed of group.categories) {
      const parent = await tx.category.create({
        data: {
          householdId,
          name: seed.name,
          type: mapDomainTransactionType(group.type),
          isSystem: true,
          icon: seed.icon,
        },
      });

      for (const subcategory of seed.subcategories ?? []) {
        await tx.category.create({
          data: {
            householdId,
            name: subcategory.name,
            type: mapDomainTransactionType(group.type),
            isSystem: true,
            parentId: parent.id,
            icon: subcategory.icon,
          },
        });
      }
    }
  }
}

export async function createCategory(
  input: CreateCategoryInput,
  householdId: string
): Promise<CreateCategoryResult> {
  const prisma = getPrisma();

  if (input.parentId !== undefined) {
    const parent = await prisma.category.findFirst({
      where: { id: input.parentId, householdId },
    });

    if (parent === null) {
      return { ok: false, error: 'parent-not-found' };
    }

    // Categories nest at most one level deep (CONTEXT.md, issue #24).
    if (parent.parentId !== null) {
      return { ok: false, error: 'parent-is-subcategory' };
    }

    if (parent.type !== mapDomainTransactionType(input.type)) {
      return { ok: false, error: 'type-mismatch' };
    }
  }

  const entityResult = createCategoryEntity({
    id: makeCategoryId(crypto.randomUUID()),
    householdId: makeHouseholdId(householdId),
    name: input.name,
    type: input.type,
    isSystem: false,
    parentId: input.parentId === undefined ? null : makeCategoryId(input.parentId),
  });

  if (!entityResult.ok) {
    return { ok: false, error: 'invalid-data' };
  }

  const validatedCategory = entityResult.value;
  const category = await prisma.category.create({
    data: {
      id: validatedCategory.id,
      householdId: validatedCategory.householdId,
      name: validatedCategory.name,
      type: mapDomainTransactionType(validatedCategory.type),
      isSystem: validatedCategory.isSystem,
      parentId: validatedCategory.parentId,
      icon: input.icon ?? null,
    },
  });

  return { ok: true, category: mapCategoryToRecord(category) };
}

export async function listCategoriesForHousehold(householdId: string): Promise<CategoryRecord[]> {
  const prisma = getPrisma();
  const categories = await prisma.category.findMany({
    where: { householdId },
    orderBy: { createdAt: 'asc' },
  });

  return categories.map(mapCategoryToRecord);
}

export async function findCategoryById(
  categoryId: string,
  householdId: string
): Promise<CategoryRecord | null> {
  const prisma = getPrisma();
  const category = await prisma.category.findFirst({
    where: { id: categoryId, householdId },
  });

  if (category === null) {
    return null;
  }

  return mapCategoryToRecord(category);
}

export async function updateCategory(
  categoryId: string,
  householdId: string,
  input: UpdateCategoryInput
): Promise<CategoryRecord | null> {
  const updateData: Partial<Pick<Category, 'name' | 'icon'>> = {};

  if (input.name !== undefined) {
    const trimmedName = input.name.trim();
    if (trimmedName === '') {
      throw unexpectedValidationError('empty-name');
    }
    updateData.name = trimmedName;
  }

  if (input.icon !== undefined) {
    // An empty string clears the icon back to the default.
    updateData.icon = input.icon === '' ? null : input.icon;
  }

  const prisma = getPrisma();
  try {
    const category = await prisma.category.update({
      where: { id: categoryId, householdId },
      data: updateData,
    });
    return mapCategoryToRecord(category);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return null;
    }
    throw error;
  }
}

export async function deleteCategory(
  categoryId: string,
  householdId: string
): Promise<DeleteCategoryResult> {
  const prisma = getPrisma();
  const category = await prisma.category.findFirst({
    where: { id: categoryId, householdId },
    include: {
      _count: { select: { children: true, transactions: true } },
    },
  });

  if (category === null) {
    return { ok: false, error: 'not-found' };
  }

  // System Categories can be renamed but never deleted (CONTEXT.md).
  if (category.isSystem) {
    return { ok: false, error: 'system-category' };
  }

  // Only leaf, unused Custom Categories are deletable (issue #24).
  if (category._count.children > 0) {
    return { ok: false, error: 'has-subcategories' };
  }

  if (category._count.transactions > 0) {
    return { ok: false, error: 'has-transactions' };
  }

  await prisma.category.delete({ where: { id: category.id } });
  return { ok: true };
}
