-- CreateEnum
CREATE TYPE "RecurrencePeriod" AS ENUM ('WEEK', 'MONTH', 'YEAR');

-- AddColumn
ALTER TABLE "RecurringTransaction" ADD COLUMN "period" "RecurrencePeriod";

-- AddColumn
ALTER TABLE "RecurringTransaction" ADD COLUMN "interval" INTEGER;

-- Backfill existing rows so the new columns are non-null.
-- frequency values were WEEKLY/MONTHLY/YEARLY with an implicit interval of 1.
UPDATE "RecurringTransaction"
SET "period" = CASE "frequency"
    WHEN 'WEEKLY' THEN 'WEEK'::"RecurrencePeriod"
    WHEN 'MONTHLY' THEN 'MONTH'::"RecurrencePeriod"
    WHEN 'YEARLY' THEN 'YEAR'::"RecurrencePeriod"
  END,
    "interval" = 1
WHERE "period" IS NULL;

-- AlterColumn
ALTER TABLE "RecurringTransaction" ALTER COLUMN "period" SET NOT NULL;

-- AlterColumn
ALTER TABLE "RecurringTransaction" ALTER COLUMN "interval" SET NOT NULL;

-- DropColumn
ALTER TABLE "RecurringTransaction" DROP COLUMN "frequency";

-- DropEnum
DROP TYPE "RecurrenceFrequency";
