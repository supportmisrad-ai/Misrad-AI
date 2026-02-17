-- Add start_city and end_city columns to nexus_time_entries
-- These columns are used in attendance punch in/out raw SQL but were missing from the DB schema

ALTER TABLE IF EXISTS public.nexus_time_entries
  ADD COLUMN IF NOT EXISTS start_city text;

ALTER TABLE IF EXISTS public.nexus_time_entries
  ADD COLUMN IF NOT EXISTS end_city text;
