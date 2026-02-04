-- 🛡️ Backup Critical Tables
-- Run BEFORE any schema changes!

\echo '🔄 Creating backup tables...'

-- Backup Organizations
DROP TABLE IF EXISTS _backup_organizations;
CREATE TABLE _backup_organizations AS 
SELECT * FROM organizations;

\echo '✅ Organizations backed up: '
SELECT COUNT(*) FROM _backup_organizations;

-- Backup Users
DROP TABLE IF EXISTS _backup_nexus_users;
CREATE TABLE _backup_nexus_users AS 
SELECT * FROM nexus_users;

\echo '✅ Nexus Users backed up: '
SELECT COUNT(*) FROM _backup_nexus_users;

-- Backup Social Users
DROP TABLE IF EXISTS _backup_social_users;
CREATE TABLE _backup_social_users AS 
SELECT * FROM social_users;

\echo '✅ Social Users backed up: '
SELECT COUNT(*) FROM _backup_social_users;

-- Backup Profiles
DROP TABLE IF EXISTS _backup_profile;
CREATE TABLE _backup_profile AS 
SELECT * FROM profile;

\echo '✅ Profiles backed up: '
SELECT COUNT(*) FROM _backup_profile;

\echo '🎯 Backup complete! Tables: _backup_organizations, _backup_nexus_users, _backup_social_users, _backup_profile'
\echo '⚠️  To restore: INSERT INTO organizations SELECT * FROM _backup_organizations;'
