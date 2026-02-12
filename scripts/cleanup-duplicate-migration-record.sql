-- Safe cleanup: Remove duplicate migration record from _prisma_migrations
-- This migration was deleted from the repo but still exists in the DB
-- Migration: 20260209150500_add_is_shabbat_protected_to_organizations
-- Reason: Duplicate of 20260209144400_add_org_is_shabbat_protected (both add the same column)

BEGIN;

-- Verify the record exists and was finished (not rolled back)
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public._prisma_migrations
  WHERE migration_name = '20260209150500_add_is_shabbat_protected_to_organizations'
    AND finished_at IS NOT NULL
    AND rolled_back_at IS NULL;
  
  IF v_count = 0 THEN
    RAISE EXCEPTION 'Migration record not found or already rolled back';
  END IF;
  
  RAISE NOTICE 'Found % record(s) to delete', v_count;
END $$;

-- Delete the duplicate migration record
DELETE FROM public._prisma_migrations
WHERE migration_name = '20260209150500_add_is_shabbat_protected_to_organizations';

-- Verify deletion
DO $$
DECLARE
  v_remaining INT;
BEGIN
  SELECT COUNT(*) INTO v_remaining
  FROM public._prisma_migrations
  WHERE migration_name = '20260209150500_add_is_shabbat_protected_to_organizations';
  
  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Migration record still exists after deletion';
  END IF;
  
  RAISE NOTICE 'Successfully deleted duplicate migration record';
END $$;

COMMIT;
