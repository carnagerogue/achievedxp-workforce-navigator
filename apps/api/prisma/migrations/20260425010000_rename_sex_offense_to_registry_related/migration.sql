-- Replace stigmatizing terminology in the OffenseType enum.
-- Postgres requires `ALTER TYPE ... RENAME VALUE` for safe enum rename.
-- This is non-destructive: existing rows referencing SEX_OFFENSE are
-- automatically updated to REGISTRY_RELATED.
ALTER TYPE "OffenseType" RENAME VALUE 'SEX_OFFENSE' TO 'REGISTRY_RELATED';
