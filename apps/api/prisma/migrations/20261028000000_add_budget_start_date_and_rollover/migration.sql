-- AlterTable
ALTER TABLE "Budget" ADD COLUMN "startDate" DATE,
ADD COLUMN "rolloverEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Backfill the start date from when the Budget was created so existing
-- Budgets keep calendar-anchored periods until progress is re-anchored.
UPDATE "Budget" SET "startDate" = "createdAt"::date WHERE "startDate" IS NULL;

ALTER TABLE "Budget" ALTER COLUMN "startDate" SET NOT NULL;
