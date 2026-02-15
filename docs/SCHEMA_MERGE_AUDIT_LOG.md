# 📋 Schema Merge Audit Log (v7 FINAL)

**Generated:** 2026-02-15T00:42:48.402Z

## Summary

| Metric | Value |
|--------|-------|
| LEGACY | 1 |
| CORE | 178 |
| NEW | 3 |
| **Total** | **182** |
| Enums | 43 |
| Rescued | 16 |
| Skipped fields | 0 |
| Skipped indexes | 443 |
| Broken relations | 0 |

## 🔥 Rescued Columns

| Table | DEV Model | Column | Field | Type |
|-------|-----------|--------|-------|------|
| `system_lead_activities` | `SystemLeadActivity` | `[relation] organizations` | `organizations` | `organizations` |
| `system_lead_handovers` | `SystemLeadHandover` | `[relation] organizations` | `organizations` | `organizations` |
| `system_invoices` | `SystemInvoice` | `[relation] organizations` | `organizations` | `organizations` |
| `system_calendar_events` | `SystemCalendarEvent` | `[relation] organizations` | `organizations` | `organizations` |
| `system_call_analyses` | `SystemCallAnalysis` | `[relation] organizations` | `organizations` | `organizations` |
| `system_portal_approvals` | `SystemPortalApproval` | `[relation] organizations` | `organizations` | `organizations` |
| `system_portal_tasks` | `SystemPortalTask` | `[relation] organizations` | `organizations` | `organizations` |
| `system_support_tickets` | `SystemSupportTicket` | `[relation] organizations` | `organizations` | `organizations` |
| `organizations` | `social_organizations` | `[relation] system_calendar_events` | `system_calendar_events` | `system_calendar_events[]` |
| `organizations` | `social_organizations` | `[relation] system_call_analyses` | `system_call_analyses` | `system_call_analyses[]` |
| `organizations` | `social_organizations` | `[relation] system_invoices` | `system_invoices` | `system_invoices[]` |
| `organizations` | `social_organizations` | `[relation] system_lead_activities` | `system_lead_activities` | `system_lead_activities[]` |
| `organizations` | `social_organizations` | `[relation] system_lead_handovers` | `system_lead_handovers` | `system_lead_handovers[]` |
| `organizations` | `social_organizations` | `[relation] system_portal_approvals` | `system_portal_approvals` | `system_portal_approvals[]` |
| `organizations` | `social_organizations` | `[relation] system_portal_tasks` | `system_portal_tasks` | `system_portal_tasks[]` |
| `organizations` | `social_organizations` | `[relation] system_support_tickets` | `system_support_tickets` | `system_support_tickets[]` |

## 🔗 Model Name Translations

| Prod | → DEV |
|------|-------|
| `activity_logs` | `ActivityLog` |
| `app_updates` | `AppUpdate` |
| `client_approvals` | `ClientApproval` |
| `client_clients` | `ClientClient` |
| `client_document_files` | `ClientDocumentFile` |
| `client_documents` | `ClientDocument` |
| `client_feedbacks` | `ClientFeedback` |
| `client_internal_notes` | `ClientInternalNote` |
| `client_portal_content` | `ClientPortalContent` |
| `client_portal_invites` | `ClientPortalInvite` |
| `client_portal_users` | `ClientPortalUser` |
| `client_profiles` | `ClientProfile` |
| `client_service_tiers` | `ClientServiceTier` |
| `client_sessions` | `ClientSession` |
| `client_shared_files` | `ClientSharedFile` |
| `client_tasks` | `ClientTask` |
| `connect_marketplace_listings` | `ConnectMarketplaceListing` |
| `core_system_settings` | `CoreSystemSettings` |
| `customer_accounts` | `CustomerAccount` |
| `device_pairing_tokens` | `DevicePairingToken` |
| `global_system_metrics` | `GlobalSystemMetric` |
| `impersonation_sessions` | `ImpersonationSession` |
| `integration_credentials` | `IntegrationCredential` |
| `integration_status` | `IntegrationStatus` |
| `misrad_activity_logs` | `MisradActivityLog` |
| `misrad_ai_liability_risks` | `MisradAiLiabilityRisk` |
| `misrad_ai_tasks` | `MisradAiTask` |
| `misrad_assigned_forms` | `MisradAssignedForm` |
| `misrad_calendar_sync_log` | `scale_calendar_sync_log` |
| `misrad_client_actions` | `MisradClientAction` |
| `misrad_client_agreements` | `MisradClientAgreement` |
| `misrad_client_assets` | `MisradClientAsset` |
| `misrad_client_deliverables` | `MisradClientDeliverable` |
| `misrad_client_handoffs` | `MisradClientHandoff` |
| `misrad_client_transformations` | `MisradClientTransformation` |
| `misrad_clients` | `MisradClient` |
| `misrad_cycle_assets` | `MisradCycleAsset` |
| `misrad_cycle_tasks` | `MisradCycleTask` |
| `misrad_cycles` | `MisradCycle` |
| `misrad_emails` | `MisradEmail` |
| `misrad_feature_requests` | `scale_feature_requests` |
| `misrad_feedback_items` | `MisradFeedbackItem` |
| `misrad_form_fields` | `MisradFormField` |
| `misrad_form_responses` | `MisradFormResponse` |
| `misrad_form_steps` | `MisradFormStep` |
| `misrad_form_templates` | `MisradFormTemplate` |
| `misrad_group_events` | `MisradGroupEvent` |
| `misrad_integrations` | `scale_integrations` |
| `misrad_invoices` | `MisradInvoice` |
| `misrad_journey_stages` | `MisradJourneyStage` |
| `misrad_meeting_analysis_results` | `MisradMeetingAnalysisResult` |
| `misrad_meeting_files` | `MisradMeetingFile` |
| `misrad_meetings` | `MisradMeeting` |
| `misrad_message_attachments` | `MisradMessageAttachment` |
| `misrad_messages` | `MisradMessage` |
| `misrad_metric_history` | `MisradMetricHistory` |
| `misrad_milestones` | `MisradMilestone` |
| `misrad_module_settings` | `MisradModuleSettings` |
| `misrad_notifications` | `MisradNotification` |
| `misrad_opportunities` | `MisradOpportunity` |
| `misrad_permissions` | `scale_permissions` |
| `misrad_roi_records` | `MisradRoiRecord` |
| `misrad_roles` | `scale_roles` |
| `misrad_stakeholders` | `MisradStakeholder` |
| `misrad_success_goals` | `MisradSuccessGoal` |
| `misrad_support_tickets` | `scale_support_tickets` |
| `misrad_workflow_blueprints` | `MisradWorkflowBlueprint` |
| `misrad_workflow_items` | `MisradWorkflowItem` |
| `misrad_workflow_stages` | `MisradWorkflowStage` |
| `navigation_menu` | `NavigationMenu` |
| `nexus_clients` | `NexusClient` |
| `nexus_tasks` | `NexusTask` |
| `nexus_tenants` | `NexusTenant` |
| `nexus_time_entries` | `NexusTimeEntry` |
| `nexus_users` | `NexusUser` |
| `oauth_tokens` | `OAuthToken` |
| `operations_inventory` | `OperationsInventory` |
| `operations_items` | `OperationsItem` |
| `operations_projects` | `OperationsProject` |
| `operations_suppliers` | `OperationsSupplier` |
| `operations_work_orders` | `OperationsWorkOrder` |
| `organization_users` | `OrganizationUser` |
| `organizations` | `social_organizations` |
| `partners` | `Partner` |
| `profiles` | `Profile` |
| `socialmedia_agency_configs` | `SocialMediaAgencyConfig` |
| `socialmedia_ai_opportunities` | `SocialMediaAiOpportunity` |
| `socialmedia_automation_rules` | `SocialMediaAutomationRule` |
| `socialmedia_business_metrics` | `SocialMediaBusinessMetric` |
| `socialmedia_calendar_events` | `SocialMediaCalendarEvent` |
| `socialmedia_campaigns` | `SocialMediaCampaign` |
| `socialmedia_client_dna` | `SocialMediaClientDna` |
| `socialmedia_client_platforms` | `SocialMediaClientPlatform` |
| `socialmedia_client_requests` | `SocialMediaClientRequest` |
| `socialmedia_clients` | `SocialMediaClient` |
| `socialmedia_conversations` | `SocialMediaConversation` |
| `socialmedia_drive_files` | `SocialMediaDriveFile` |
| `socialmedia_feedback` | `SocialMediaFeedback` |
| `socialmedia_ideas` | `SocialMediaIdea` |
| `socialmedia_invoices` | `SocialMediaInvoice` |
| `socialmedia_manager_requests` | `SocialMediaManagerRequest` |
| `socialmedia_messages` | `SocialMediaMessage` |
| `socialmedia_payment_orders` | `SocialMediaPaymentOrder` |
| `socialmedia_platform_credentials` | `SocialMediaPlatformCredential` |
| `socialmedia_platform_quotas` | `SocialMediaPlatformQuota` |
| `socialmedia_post_comments` | `SocialMediaPostComment` |
| `socialmedia_post_platforms` | `SocialMediaPostPlatform` |
| `socialmedia_post_variations` | `SocialMediaPostVariation` |
| `socialmedia_posts` | `SocialPost` |
| `socialmedia_sheets_sync_configs` | `SocialMediaSheetsSyncConfig` |
| `socialmedia_site_content` | `SocialMediaSiteContent` |
| `socialmedia_sync_logs` | `SocialMediaSyncLog` |
| `socialmedia_tasks` | `SocialMediaTask` |
| `system_assets` | `SystemAsset` |
| `system_automations` | `SystemAutomation` |
| `system_backups` | `SystemBackup` |
| `system_calendar_events` | `SystemCalendarEvent` |
| `system_call_analyses` | `SystemCallAnalysis` |
| `system_campaigns` | `SystemCampaign` |
| `system_content_items` | `SystemContentItem` |
| `system_field_agents` | `SystemFieldAgent` |
| `system_forms` | `SystemForm` |
| `system_invoices` | `SystemInvoice` |
| `system_lead_activities` | `SystemLeadActivity` |
| `system_lead_custom_field_definitions` | `SystemLeadCustomFieldDefinition` |
| `system_lead_handovers` | `SystemLeadHandover` |
| `system_leads` | `SystemLead` |
| `system_partners` | `SystemPartner` |
| `system_pipeline_stages` | `SystemPipelineStage` |
| `system_portal_approvals` | `SystemPortalApproval` |
| `system_portal_tasks` | `SystemPortalTask` |
| `system_students` | `SystemStudent` |
| `system_support_tickets` | `SystemSupportTicket` |
| `system_tasks` | `SystemTask` |
| `system_webhook_logs` | `SystemWebhookLog` |
| `team_comments` | `TeamComment` |
| `team_member_clients` | `TeamMemberClient` |
| `team_members` | `TeamMember` |
| `user_update_views` | `UserUpdateView` |
| `web_push_subscriptions` | `WebPushSubscription` |
| `webhook_configs` | `WebhookConfig` |
| `work_listings` | `WorkListing` |

## 🔄 CORE

- `ActivityLog` ✅
- `ai_embeddings` ✅
- `ai_feature_settings` ✅
- `ai_model_aliases` ✅
- `ai_provider_keys` ✅
- `ai_usage_logs` ✅
- `AppUpdate` ✅
- `billing_events` ✅
- `business_metrics` ✅
- `charges` ✅
- `client_dna` ✅
- `ClientApproval` ✅
- `ClientClient` ✅
- `ClientDocument` ✅
- `ClientDocumentFile` ✅
- `ClientFeedback` ✅
- `ClientInternalNote` ✅
- `ClientPortalContent` ✅
- `ClientPortalInvite` ✅
- `ClientPortalUser` ✅
- `ClientProfile` ✅
- `clients` ✅
- `ClientServiceTier` ✅
- `ClientSession` ✅
- `ClientSharedFile` ✅
- `ClientTask` ✅
- `ConnectMarketplaceListing` ✅
- `CoreSystemSettings` ✅
- `coupon_redemptions` ✅
- `coupons` ✅
- `CustomerAccount` ✅
- `DevicePairingToken` ✅
- `finance_whatsapp_reminder_events` ✅
- `global_settings` ✅
- `GlobalSystemMetric` ✅
- `help_videos` ✅
- `ImpersonationSession` ✅
- `integration_idempotency_keys` ✅
- `IntegrationCredential` ✅
- `IntegrationStatus` ✅
- `landing_faq` ✅
- `landing_testimonials` ✅
- `MisradActivityLog` ✅
- `MisradAiLiabilityRisk` ✅
- `MisradAiTask` ✅
- `MisradAssignedForm` ✅
- `MisradClient` ✅
- `MisradClientAction` ✅
- `MisradClientAgreement` ✅
- `MisradClientAsset` ✅
- `MisradClientDeliverable` ✅
- `MisradClientHandoff` ✅
- `MisradClientTransformation` ✅
- `MisradCycle` ✅
- `MisradCycleAsset` ✅
- `MisradCycleTask` ✅
- `MisradEmail` ✅
- `MisradFeedbackItem` ✅
- `MisradFormField` ✅
- `MisradFormResponse` ✅
- `MisradFormStep` ✅
- `MisradFormTemplate` ✅
- `MisradGroupEvent` ✅
- `MisradInvoice` ✅
- `MisradJourneyStage` ✅
- `MisradMeeting` ✅
- `MisradMeetingAnalysisResult` ✅
- `MisradMeetingFile` ✅
- `MisradMessage` ✅
- `MisradMessageAttachment` ✅
- `MisradMetricHistory` ✅
- `MisradMilestone` ✅
- `MisradModuleSettings` ✅
- `MisradNotification` ✅
- `MisradOpportunity` ✅
- `MisradRoiRecord` ✅
- `MisradStakeholder` ✅
- `MisradSuccessGoal` ✅
- `MisradWorkflowBlueprint` ✅
- `MisradWorkflowItem` ✅
- `MisradWorkflowStage` ✅
- `NavigationMenu` ✅
- `nexus_billing_items` ✅
- `nexus_employee_invitation_links` ✅
- `nexus_event_attendance` ✅
- `nexus_leave_requests` ✅
- `nexus_onboarding_settings` ✅
- `nexus_team_events` ✅
- `NexusClient` ✅
- `NexusTask` ✅
- `NexusTenant` ✅
- `NexusTimeEntry` ✅
- `NexusUser` ✅
- `OAuthToken` ✅
- `OperationsInventory` ✅
- `OperationsItem` ✅
- `OperationsProject` ✅
- `OperationsSupplier` ✅
- `OperationsWorkOrder` ✅
- `organization_settings` ✅
- `organization_signup_invitations` ✅
- `OrganizationUser` ✅
- `Partner` ✅
- `platform_credentials` ✅
- `platform_quotas` ✅
- `Profile` ✅
- `scale_calendar_sync_log` ✅
- `scale_feature_requests` ✅
- `scale_integrations` ✅
- `scale_permissions` ✅
- `scale_roles` ✅
- `scale_support_tickets` ✅
- `social_organizations` ⚠️ 8 rescued
- `SocialMediaAgencyConfig` ✅
- `SocialMediaAiOpportunity` ✅
- `SocialMediaAutomationRule` ✅
- `SocialMediaBusinessMetric` ✅
- `SocialMediaCalendarEvent` ✅
- `SocialMediaCampaign` ✅
- `SocialMediaClient` ✅
- `SocialMediaClientDna` ✅
- `SocialMediaClientPlatform` ✅
- `SocialMediaClientRequest` ✅
- `SocialMediaConversation` ✅
- `SocialMediaDriveFile` ✅
- `SocialMediaFeedback` ✅
- `SocialMediaIdea` ✅
- `SocialMediaInvoice` ✅
- `SocialMediaManagerRequest` ✅
- `SocialMediaMessage` ✅
- `SocialMediaPaymentOrder` ✅
- `SocialMediaPlatformCredential` ✅
- `SocialMediaPlatformQuota` ✅
- `SocialMediaPostComment` ✅
- `SocialMediaPostPlatform` ✅
- `SocialMediaPostVariation` ✅
- `SocialMediaSheetsSyncConfig` ✅
- `SocialMediaSiteContent` ✅
- `SocialMediaSyncLog` ✅
- `SocialMediaTask` ✅
- `SocialPost` ✅
- `strategic_content` ✅
- `subscription_items` ✅
- `subscription_orders` ✅
- `subscription_payment_configs` ✅
- `subscriptions` ✅
- `support_ticket_events` ✅
- `system_invitation_links` ✅
- `system_settings` ✅
- `SystemAsset` ✅
- `SystemAutomation` ✅
- `SystemBackup` ✅
- `SystemCalendarEvent` ⚠️ 1 rescued
- `SystemCallAnalysis` ⚠️ 1 rescued
- `SystemCampaign` ✅
- `SystemContentItem` ✅
- `SystemFieldAgent` ✅
- `SystemForm` ✅
- `SystemInvoice` ⚠️ 1 rescued
- `SystemLead` ✅
- `SystemLeadActivity` ⚠️ 1 rescued
- `SystemLeadCustomFieldDefinition` ✅
- `SystemLeadHandover` ⚠️ 1 rescued
- `SystemPartner` ✅
- `SystemPipelineStage` ✅
- `SystemPortalApproval` ⚠️ 1 rescued
- `SystemPortalTask` ⚠️ 1 rescued
- `SystemStudent` ✅
- `SystemSupportTicket` ⚠️ 1 rescued
- `SystemTask` ✅
- `SystemWebhookLog` ✅
- `TeamComment` ✅
- `TeamMember` ✅
- `TeamMemberClient` ✅
- `UserUpdateView` ✅
- `WebhookConfig` ✅
- `WebPushSubscription` ✅
- `WorkListing` ✅

## 📦 LEGACY

- `notifications`

## 🆕 NEW

- `BusinessClient`
- `BusinessClientContact`
- `Notification`

## 🔜 Next Steps

1. `npx prisma validate --schema=prisma/schema.final.prisma`
2. Review rescued columns
3. `copy prisma\schema.final.prisma prisma\schema.prisma`
4. `npx prisma generate`