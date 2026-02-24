-- Migration: Add admin_android_download_url to global_settings
-- Date: 2025-02-25
-- Purpose: Separate download URL for Admin APK (with biometric auth)
-- Safe: additive column, no data loss

ALTER TABLE global_settings
ADD COLUMN IF NOT EXISTS admin_android_download_url TEXT;
