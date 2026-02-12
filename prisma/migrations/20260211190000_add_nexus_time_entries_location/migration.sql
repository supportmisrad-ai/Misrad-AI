-- Add punch in/out geolocation columns to nexus_time_entries (non-destructive)

ALTER TABLE "nexus_time_entries"
  ADD COLUMN IF NOT EXISTS "start_lat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "start_lng" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "start_accuracy" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "end_lat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "end_lng" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "end_accuracy" DOUBLE PRECISION;
