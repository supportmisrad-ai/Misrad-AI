-- 🆘 Restore from backup tables
-- Use this if data was accidentally deleted

BEGIN;

\echo '🔄 Restoring from backup...'

-- Check if backups exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = '_backup_organizations') THEN
    RAISE EXCEPTION 'No backup found! Cannot restore.';
  END IF;
END $$;

-- Restore Organizations (merge, don't delete existing)
INSERT INTO organizations
SELECT * FROM _backup_organizations
ON CONFLICT (id) DO NOTHING;

\echo '✅ Organizations restored: '
SELECT COUNT(*) FROM organizations;

-- Restore Nexus Users
INSERT INTO nexus_users
SELECT * FROM _backup_nexus_users
ON CONFLICT (id) DO NOTHING;

\echo '✅ Nexus Users restored: '
SELECT COUNT(*) FROM nexus_users;

-- Restore Social Users
INSERT INTO social_users
SELECT * FROM _backup_social_users
ON CONFLICT (id) DO NOTHING;

\echo '✅ Social Users restored: '
SELECT COUNT(*) FROM social_users;

-- Restore Profiles
INSERT INTO profile
SELECT * FROM _backup_profile
ON CONFLICT (id) DO NOTHING;

\echo '✅ Profiles restored: '
SELECT COUNT(*) FROM profile;

COMMIT;

\echo '🎯 Restore complete!'
