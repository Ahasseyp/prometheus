-- Enforce at most one OWNER membership per user. This closes the race where
-- two concurrent `household.create` calls for the same user could both create
-- an owner membership before the application-layer guard sees the other one.
CREATE UNIQUE INDEX "HouseholdMembership_userId_owner_key"
  ON "HouseholdMembership"("userId")
  WHERE role = 'OWNER';
