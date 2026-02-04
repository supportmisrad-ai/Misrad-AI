SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'social_organizations'
ORDER BY ordinal_position;
