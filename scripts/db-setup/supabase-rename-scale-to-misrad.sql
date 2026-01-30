-- ============================================
-- Misrad OS - Rename (Option A / No data loss)
-- ============================================
-- Purpose:
--   Rename legacy Scale tables to Misrad tables, and social_organizations -> organizations.
--   This script is intended for an EXISTING database.
--
-- Notes:
--   - Safe to run multiple times (uses IF EXISTS).
--   - Does NOT drop data.
--   - Execute in Supabase SQL Editor.
-- ============================================

BEGIN;

-- 1) Organizations
ALTER TABLE IF EXISTS public.social_organizations RENAME TO organizations;

-- 2) Scale -> Misrad (tables used by the app)
ALTER TABLE IF EXISTS public.scale_integrations RENAME TO misrad_integrations;
ALTER TABLE IF EXISTS public.scale_notifications RENAME TO misrad_notifications;
ALTER TABLE IF EXISTS public.scale_roles RENAME TO misrad_roles;
ALTER TABLE IF EXISTS public.scale_permissions RENAME TO misrad_permissions;
ALTER TABLE IF EXISTS public.scale_feature_requests RENAME TO misrad_feature_requests;
ALTER TABLE IF EXISTS public.scale_support_tickets RENAME TO misrad_support_tickets;
ALTER TABLE IF EXISTS public.scale_calendar_sync_log RENAME TO misrad_calendar_sync_log;

COMMIT;
