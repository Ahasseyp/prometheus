ALTER TABLE "Transaction"
  ADD COLUMN "reportingCurrency" TEXT,
  ADD COLUMN "exchangeRate" NUMERIC(19,8),
  ADD COLUMN "exchangeRateOverridden" BOOLEAN NOT NULL DEFAULT false;
