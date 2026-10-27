import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { TransactionType } from '@prometheus/domain';

import {
  createCategory,
  deleteCategory,
  findCategoryById,
  listCategoriesForHousehold,
  updateCategory,
} from './services/category.js';
import { getHouseholdId, protectedProcedure, router, throwServiceError } from './trpc.js';

const transactionTypeSchema = z.nativeEnum(TransactionType);

const categoryNameSchema = z.string().refine((value) => value.trim().length > 0, {
  message: 'Enter a category name.',
});

const categoryIconSchema = z
  .string()
  .trim()
  .max(64)
  .refine((value) => value === '' || /^[a-z0-9-]+$/.test(value), {
    message: 'Icon must be a kebab-case icon name.',
  });

const categoryResponseSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  name: z.string(),
  type: transactionTypeSchema,
  isSystem: z.boolean(),
  parentId: z.string().uuid().nullable(),
  icon: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const createCategoryInputSchema = z.object({
  name: categoryNameSchema,
  type: transactionTypeSchema,
  parentId: z.string().uuid().optional(),
  icon: categoryIconSchema.optional(),
});

const categoryIdInputSchema = z.object({
  id: z.string().uuid(),
});

const updateCategoryInputSchema = z.object({
  id: z.string().uuid(),
  name: categoryNameSchema,
  icon: categoryIconSchema.optional(),
});

function ensureCategoryFound<T>(category: T | null): T {
  if (category === null) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found.' });
  }
  return category;
}

const createCategoryErrorMappings = {
  'parent-not-found': { code: 'NOT_FOUND', message: 'Parent category not found.' },
  'parent-is-subcategory': {
    code: 'BAD_REQUEST',
    message: 'Categories can only be nested one level deep.',
  },
  'type-mismatch': {
    code: 'BAD_REQUEST',
    message: 'A subcategory must have the same type as its parent category.',
  },
} as const;

const deleteCategoryErrorMappings = {
  'not-found': { code: 'NOT_FOUND', message: 'Category not found.' },
  'system-category': {
    code: 'PRECONDITION_FAILED',
    message: 'System Categories cannot be deleted.',
  },
  'has-subcategories': {
    code: 'PRECONDITION_FAILED',
    message: 'Delete this category’s subcategories first.',
  },
  'has-transactions': {
    code: 'PRECONDITION_FAILED',
    message: 'This category is used by transactions and cannot be deleted.',
  },
} as const;

export const categoryRouter = router({
  create: protectedProcedure
    .input(createCategoryInputSchema)
    .output(categoryResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx, 'categories');
      const result = await createCategory(input, householdId);
      if (!result.ok) {
        throwServiceError(result.error, createCategoryErrorMappings);
      }
      return result.category;
    }),

  list: protectedProcedure.output(z.array(categoryResponseSchema)).query(async ({ ctx }) => {
    const householdId = getHouseholdId(ctx, 'categories');
    return listCategoriesForHousehold(householdId);
  }),

  get: protectedProcedure
    .input(categoryIdInputSchema)
    .output(categoryResponseSchema)
    .query(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx, 'categories');
      const category = await findCategoryById(input.id, householdId);
      return ensureCategoryFound(category);
    }),

  update: protectedProcedure
    .input(updateCategoryInputSchema)
    .output(categoryResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx, 'categories');
      const category = await updateCategory(input.id, householdId, {
        name: input.name,
        icon: input.icon,
      });
      return ensureCategoryFound(category);
    }),

  delete: protectedProcedure
    .input(categoryIdInputSchema)
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async ({ input, ctx }) => {
      const householdId = getHouseholdId(ctx, 'categories');
      const result = await deleteCategory(input.id, householdId);
      if (!result.ok) {
        throwServiceError(result.error, deleteCategoryErrorMappings);
      }
      return { ok: true as const };
    }),
});

export type CategoryRouter = typeof categoryRouter;
