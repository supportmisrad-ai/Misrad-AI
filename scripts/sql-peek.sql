-- List all tables in public schema with a fast row-count estimate
-- (pg_class.reltuples is an estimate; for exact counts, we can target specific tables)
SELECT
  n.nspname  AS schema_name,
  c.relname  AS table_name,
  c.reltuples::bigint AS estimated_rows
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.reltuples DESC, c.relname ASC;
