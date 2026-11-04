import { listAccountsForHousehold } from '../services/account.js';
import { listCategoriesForHousehold } from '../services/category.js';
import { getPrisma } from '../prisma.js';

import type { ResolvedCommand } from './add-command.js';
import { parseEntry } from './parse-entry.js';
import { resolveEntry, type HouseholdContext } from './resolve-entry.js';

export async function submitCommand(householdId: string, text: string): Promise<ResolvedCommand> {
  const prisma = getPrisma();
  const [household, accounts, categories] = await Promise.all([
    prisma.household.findUnique({ where: { id: householdId } }),
    listAccountsForHousehold(householdId),
    listCategoriesForHousehold(householdId),
  ]);

  if (household === null) {
    throw new Error(`Household not found: ${householdId}`);
  }

  const context: HouseholdContext = {
    reportingCurrency: household.reportingCurrency,
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      currency: a.currency,
      type: a.type,
    })),
    categories: categories
      .filter((c) => c.type === 'income' || c.type === 'expense')
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type as 'income' | 'expense',
      })),
  };

  const extracted = await parseEntry(text);
  return resolveEntry(extracted, context);
}
