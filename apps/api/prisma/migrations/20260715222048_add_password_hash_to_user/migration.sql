-- AlterTable
-- This migration assumes the User table is empty (the table was introduced
-- in the previous migration and no registration flow existed before now).
-- Adding a non-nullable column without a default will fail if rows exist.
ALTER TABLE "User" ADD COLUMN     "passwordHash" TEXT NOT NULL;
