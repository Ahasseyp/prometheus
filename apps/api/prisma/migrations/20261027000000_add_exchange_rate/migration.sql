CREATE TABLE "ExchangeRate" (
  "id" UUID NOT NULL,
  "baseCurrency" TEXT NOT NULL,
  "quoteCurrency" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "rate" NUMERIC(19,8) NOT NULL,
  "provider" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExchangeRate_baseCurrency_quoteCurrency_date_key"
  ON "ExchangeRate" ("baseCurrency", "quoteCurrency", "date");
