-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'TRANSFER';

-- AlterTable

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "categoryId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Transfer" (
    "id" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "sourceTransactionId" UUID NOT NULL,
    "destinationTransactionId" UUID NOT NULL,
    "exchangeRate" DECIMAL(19,8),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_sourceTransactionId_key" ON "Transfer"("sourceTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_destinationTransactionId_key" ON "Transfer"("destinationTransactionId");

-- CreateIndex
CREATE INDEX "Transfer_householdId_idx" ON "Transfer"("householdId");

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_sourceTransactionId_fkey" FOREIGN KEY ("sourceTransactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_destinationTransactionId_fkey" FOREIGN KEY ("destinationTransactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

