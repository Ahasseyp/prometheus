import { generateDueInstances } from '../services/recurring-transaction.js';

/**
 * Generates due Recurring Transaction Instances once at server startup.
 *
 * Day-to-day generation happens lazily whenever a household lists its recurring
 * transactions or transactions, so a long-running timer is not required.
 */
export async function bootstrapRecurringTransactionGeneration(): Promise<void> {
  await generateDueInstances();
}
