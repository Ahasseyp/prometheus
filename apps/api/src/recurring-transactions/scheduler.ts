import { generateDueInstances } from '../services/recurring-transaction.js';

export async function startRecurringTransactionGenerationSchedule(): Promise<void> {
  await generateDueInstances();
}
