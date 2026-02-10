-- Check trial_days column defaults
SELECT 
    table_name,
    column_name,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'trial_days'
  AND table_name IN ('social_organizations', 'social_team_members')
ORDER BY table_name;
