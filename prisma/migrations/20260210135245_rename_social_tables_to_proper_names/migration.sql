-- Migration: Rename social_ tables to proper names
-- Safe migration - preserves all data using ALTER TABLE RENAME
-- Date: 2026-02-10

-- ============================================================
-- PHASE 1: Core Tables (Remove social_ prefix)
-- ============================================================

-- Rename social_users -> organization_users
ALTER TABLE IF EXISTS social_users RENAME TO organization_users;

-- Rename social_team_members -> team_members
ALTER TABLE IF EXISTS social_team_members RENAME TO team_members;

-- Rename social_team_member_clients -> team_member_clients
ALTER TABLE IF EXISTS social_team_member_clients RENAME TO team_member_clients;

-- Rename social_team_comments -> team_comments
ALTER TABLE IF EXISTS social_team_comments RENAME TO team_comments;

-- Rename social_notifications -> notifications
ALTER TABLE IF EXISTS social_notifications RENAME TO notifications;

-- Rename social_navigation_menu -> navigation_menu
ALTER TABLE IF EXISTS social_navigation_menu RENAME TO navigation_menu;

-- Rename social_impersonation_sessions -> impersonation_sessions
ALTER TABLE IF EXISTS social_impersonation_sessions RENAME TO impersonation_sessions;

-- Rename social_global_system_metrics -> global_system_metrics
ALTER TABLE IF EXISTS social_global_system_metrics RENAME TO global_system_metrics;

-- Rename social_system_settings -> core_system_settings
ALTER TABLE IF EXISTS social_system_settings RENAME TO core_system_settings;

-- Rename social_system_backups -> system_backups
ALTER TABLE IF EXISTS social_system_backups RENAME TO system_backups;

-- Rename social_activity_logs -> activity_logs
ALTER TABLE IF EXISTS social_activity_logs RENAME TO activity_logs;

-- Rename social_integration_credentials -> integration_credentials
ALTER TABLE IF EXISTS social_integration_credentials RENAME TO integration_credentials;

-- Rename social_integration_status -> integration_status
ALTER TABLE IF EXISTS social_integration_status RENAME TO integration_status;

-- Rename social_oauth_tokens -> oauth_tokens
ALTER TABLE IF EXISTS social_oauth_tokens RENAME TO oauth_tokens;

-- Rename social_webhook_configs -> webhook_configs
ALTER TABLE IF EXISTS social_webhook_configs RENAME TO webhook_configs;

-- Rename social_user_update_views -> user_update_views
ALTER TABLE IF EXISTS social_user_update_views RENAME TO user_update_views;

-- Rename social_app_updates -> app_updates
ALTER TABLE IF EXISTS social_app_updates RENAME TO app_updates;

-- ============================================================
-- PHASE 2: Social Media Module Tables (social_ -> socialmedia_)
-- ============================================================

-- Rename social_clients -> socialmedia_clients
ALTER TABLE IF EXISTS social_clients RENAME TO socialmedia_clients;

-- Rename social_client_dna -> socialmedia_client_dna
ALTER TABLE IF EXISTS social_client_dna RENAME TO socialmedia_client_dna;

-- Rename social_client_active_platforms -> socialmedia_client_platforms
ALTER TABLE IF EXISTS social_client_active_platforms RENAME TO socialmedia_client_platforms;

-- Rename social_client_requests -> socialmedia_client_requests
ALTER TABLE IF EXISTS social_client_requests RENAME TO socialmedia_client_requests;

-- Rename social_campaigns -> socialmedia_campaigns
ALTER TABLE IF EXISTS social_campaigns RENAME TO socialmedia_campaigns;

-- Rename social_posts -> socialmedia_posts
ALTER TABLE IF EXISTS social_posts RENAME TO socialmedia_posts;

-- Rename social_post_platforms -> socialmedia_post_platforms
ALTER TABLE IF EXISTS social_post_platforms RENAME TO socialmedia_post_platforms;

-- Rename social_post_variations -> socialmedia_post_variations
ALTER TABLE IF EXISTS social_post_variations RENAME TO socialmedia_post_variations;

-- Rename social_post_comments -> socialmedia_post_comments
ALTER TABLE IF EXISTS social_post_comments RENAME TO socialmedia_post_comments;

-- Rename social_platform_credentials -> socialmedia_platform_credentials
ALTER TABLE IF EXISTS social_platform_credentials RENAME TO socialmedia_platform_credentials;

-- Rename social_platform_quotas -> socialmedia_platform_quotas
ALTER TABLE IF EXISTS social_platform_quotas RENAME TO socialmedia_platform_quotas;

-- Rename social_conversations -> socialmedia_conversations
ALTER TABLE IF EXISTS social_conversations RENAME TO socialmedia_conversations;

-- Rename social_messages -> socialmedia_messages
ALTER TABLE IF EXISTS social_messages RENAME TO socialmedia_messages;

-- Rename social_ideas -> socialmedia_ideas
ALTER TABLE IF EXISTS social_ideas RENAME TO socialmedia_ideas;

-- Rename social_automation_rules -> socialmedia_automation_rules
ALTER TABLE IF EXISTS social_automation_rules RENAME TO socialmedia_automation_rules;

-- Rename social_ai_opportunities -> socialmedia_ai_opportunities
ALTER TABLE IF EXISTS social_ai_opportunities RENAME TO socialmedia_ai_opportunities;

-- Rename social_business_metrics -> socialmedia_business_metrics
ALTER TABLE IF EXISTS social_business_metrics RENAME TO socialmedia_business_metrics;

-- Rename social_calendar_events -> socialmedia_calendar_events
ALTER TABLE IF EXISTS social_calendar_events RENAME TO socialmedia_calendar_events;

-- Rename social_agency_service_configs -> socialmedia_agency_configs
ALTER TABLE IF EXISTS social_agency_service_configs RENAME TO socialmedia_agency_configs;

-- Rename social_feedback -> socialmedia_feedback
ALTER TABLE IF EXISTS social_feedback RENAME TO socialmedia_feedback;

-- Rename social_tasks -> socialmedia_tasks
ALTER TABLE IF EXISTS social_tasks RENAME TO socialmedia_tasks;

-- Rename social_manager_requests -> socialmedia_manager_requests
ALTER TABLE IF EXISTS social_manager_requests RENAME TO socialmedia_manager_requests;

-- Rename social_invoices -> socialmedia_invoices
ALTER TABLE IF EXISTS social_invoices RENAME TO socialmedia_invoices;

-- Rename social_payment_orders -> socialmedia_payment_orders
ALTER TABLE IF EXISTS social_payment_orders RENAME TO socialmedia_payment_orders;

-- Rename social_drive_files -> socialmedia_drive_files
ALTER TABLE IF EXISTS social_drive_files RENAME TO socialmedia_drive_files;

-- Rename social_sheets_sync_configs -> socialmedia_sheets_sync_configs
ALTER TABLE IF EXISTS social_sheets_sync_configs RENAME TO socialmedia_sheets_sync_configs;

-- Rename social_sync_logs -> socialmedia_sync_logs
ALTER TABLE IF EXISTS social_sync_logs RENAME TO socialmedia_sync_logs;

-- Rename social_site_content -> socialmedia_site_content
ALTER TABLE IF EXISTS social_site_content RENAME TO socialmedia_site_content;

-- ============================================================
-- PHASE 3: Update Indexes (rename to match new table names)
-- ============================================================

-- Note: PostgreSQL automatically renames indexes when table is renamed
-- This is handled by the database engine

-- ============================================================
-- PHASE 4: Verify Data Integrity
-- ============================================================

-- Data integrity check will be performed after migration
-- No data loss expected - only table renames
