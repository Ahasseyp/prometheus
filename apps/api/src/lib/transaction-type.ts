import { TransactionType } from '@prometheus/domain';
import type { TransactionType as DomainTransactionType } from '@prometheus/domain';
import type { $Enums } from '@prisma/client';

const prismaTransactionTypeMap: Record<$Enums.TransactionType, DomainTransactionType> = {
  INCOME: TransactionType.Income,
  EXPENSE: TransactionType.Expense,
  TRANSFER: TransactionType.Transfer,
};

const domainTransactionTypeMap: Record<DomainTransactionType, $Enums.TransactionType> = {
  [TransactionType.Income]: 'INCOME',
  [TransactionType.Expense]: 'EXPENSE',
  [TransactionType.Transfer]: 'TRANSFER',
};

export function mapPrismaTransactionType(type: $Enums.TransactionType): DomainTransactionType {
  return prismaTransactionTypeMap[type];
}

export function mapDomainTransactionType(type: DomainTransactionType): $Enums.TransactionType {
  return domainTransactionTypeMap[type];
}
