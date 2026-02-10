#!/usr/bin/env node
/**
 * Ultra-perfectionist schema migration script
 * Renames ALL social_ models and updates ALL references
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

// Model name mapping: OLD Prisma model name -> NEW Prisma model name
const MODEL_RENAMES = {
  // Core tables - CamelCase for Prisma models
  'social_users': 'OrganizationUser',
  'social_team_members': 'TeamMember',
  'social_team_member_clients': 'TeamMemberClient',
  'social_team_comments': 'TeamComment',
  'social_notifications': 'Notification',
  'social_navigation_menu': 'NavigationMenu',
  'social_impersonation_sessions': 'ImpersonationSession',
  'social_global_system_metrics': 'GlobalSystemMetric',
  'social_system_settings': 'CoreSystemSettings',
  'social_system_backups': 'SystemBackup',
  'social_activity_logs': 'ActivityLog',
  'social_integration_credentials': 'IntegrationCredential',
  'social_integration_status': 'IntegrationStatus',
  'social_oauth_tokens': 'OAuthToken',
  'social_webhook_configs': 'WebhookConfig',
  'social_user_update_views': 'UserUpdateView',
  'social_app_updates': 'AppUpdate',
  
  // Social Media tables - keep SocialMedia prefix for clarity
  'social_clients': 'SocialMediaClient',
  'social_client_dna': 'SocialMediaClientDna',
  'social_client_active_platforms': 'SocialMediaClientPlatform',
  'social_client_requests': 'SocialMediaClientRequest',
  'social_campaigns': 'SocialMediaCampaign',
  'social_posts': 'SocialMediaPost',
  'social_post_platforms': 'SocialMediaPostPlatform',
  'social_post_variations': 'SocialMediaPostVariation',
  'social_post_comments': 'SocialMediaPostComment',
  'social_platform_credentials': 'SocialMediaPlatformCredential',
  'social_platform_quotas': 'SocialMediaPlatformQuota',
  'social_conversations': 'SocialMediaConversation',
  'social_messages': 'SocialMediaMessage',
  'social_ideas': 'SocialMediaIdea',
  'social_automation_rules': 'SocialMediaAutomationRule',
  'social_ai_opportunities': 'SocialMediaAiOpportunity',
  'social_business_metrics': 'SocialMediaBusinessMetric',
  'social_calendar_events': 'SocialMediaCalendarEvent',
  'social_agency_service_configs': 'SocialMediaAgencyConfig',
  'social_feedback': 'SocialMediaFeedback',
  'social_tasks': 'SocialMediaTask',
  'social_manager_requests': 'SocialMediaManagerRequest',
  'social_invoices': 'SocialMediaInvoice',
  'social_payment_orders': 'SocialMediaPaymentOrder',
  'social_drive_files': 'SocialMediaDriveFile',
  'social_sheets_sync_configs': 'SocialMediaSheetsSyncConfig',
  'social_sync_logs': 'SocialMediaSyncLog',
  'social_site_content': 'SocialMediaSiteContent',
};

// DB table name mapping (snake_case as in migration.sql)
const TABLE_RENAMES = {
  'social_users': 'organization_users',
  'social_team_members': 'team_members',
  'social_team_member_clients': 'team_member_clients',
  'social_team_comments': 'team_comments',
  'social_notifications': 'notifications',
  'social_navigation_menu': 'navigation_menu',
  'social_impersonation_sessions': 'impersonation_sessions',
  'social_global_system_metrics': 'global_system_metrics',
  'social_system_settings': 'core_system_settings',
  'social_system_backups': 'system_backups',
  'social_activity_logs': 'activity_logs',
  'social_integration_credentials': 'integration_credentials',
  'social_integration_status': 'integration_status',
  'social_oauth_tokens': 'oauth_tokens',
  'social_webhook_configs': 'webhook_configs',
  'social_user_update_views': 'user_update_views',
  'social_app_updates': 'app_updates',
  'social_clients': 'socialmedia_clients',
  'social_client_dna': 'socialmedia_client_dna',
  'social_client_active_platforms': 'socialmedia_client_platforms',
  'social_client_requests': 'socialmedia_client_requests',
  'social_campaigns': 'socialmedia_campaigns',
  'social_posts': 'socialmedia_posts',
  'social_post_platforms': 'socialmedia_post_platforms',
  'social_post_variations': 'socialmedia_post_variations',
  'social_post_comments': 'socialmedia_post_comments',
  'social_platform_credentials': 'socialmedia_platform_credentials',
  'social_platform_quotas': 'socialmedia_platform_quotas',
  'social_conversations': 'socialmedia_conversations',
  'social_messages': 'socialmedia_messages',
  'social_ideas': 'socialmedia_ideas',
  'social_automation_rules': 'socialmedia_automation_rules',
  'social_ai_opportunities': 'socialmedia_ai_opportunities',
  'social_business_metrics': 'socialmedia_business_metrics',
  'social_calendar_events': 'socialmedia_calendar_events',
  'social_agency_service_configs': 'socialmedia_agency_configs',
  'social_feedback': 'socialmedia_feedback',
  'social_tasks': 'socialmedia_tasks',
  'social_manager_requests': 'socialmedia_manager_requests',
  'social_invoices': 'socialmedia_invoices',
  'social_payment_orders': 'socialmedia_payment_orders',
  'social_drive_files': 'socialmedia_drive_files',
  'social_sheets_sync_configs': 'socialmedia_sheets_sync_configs',
  'social_sync_logs': 'socialmedia_sync_logs',
  'social_site_content': 'socialmedia_site_content',
};

console.log('🔄 מתחיל מיגרציית schema מלאה...\n');
console.log('⚠️  הערה: זה ישנה שמות מודלים - תצטרך לעדכן קוד TypeScript!\n');

let content = fs.readFileSync(schemaPath, 'utf-8');
const originalContent = content;

let modelsRenamed = 0;
let relationsUpdated = 0;

// Step 1: Update model declarations
console.log('שלב 1: עדכון הצהרות מודלים...');
for (const [oldName, newName] of Object.entries(MODEL_RENAMES)) {
  const modelRegex = new RegExp(`^model ${oldName} \\{`, 'gm');
  if (content.match(modelRegex)) {
    content = content.replace(modelRegex, `model ${newName} {`);
    
    // Add @@map if not exists
    const newTableName = TABLE_RENAMES[oldName];
    const mapRegex = new RegExp(`(model ${newName} \\{[\\s\\S]*?)(\\n\\})`, 'm');
    const hasMap = content.match(new RegExp(`model ${newName} \\{[\\s\\S]*?@@map\\("`, 'm'));
    
    if (!hasMap && mapRegex.test(content)) {
      content = content.replace(mapRegex, `$1\n  @@map("${newTableName}")$2`);
    }
    
    modelsRenamed++;
    console.log(`  ✅ ${oldName} -> ${newName} (@@map("${newTableName}"))`);
  }
}

// Step 2: Update all relation references
console.log('\nשלב 2: עדכון קשרים (relations)...');
for (const [oldName, newName] of Object.entries(MODEL_RENAMES)) {
  // Find relation declarations that reference old model name
  const relationRegex = new RegExp(`\\b${oldName}(\\[\\]|\\?)?(\\s+@relation)`, 'g');
  const matches = content.match(relationRegex);
  
  if (matches) {
    content = content.replace(relationRegex, `${newName}$1$2`);
    relationsUpdated += matches.length;
  }
}

// Step 3: social_organizations is special - already mapped to "organizations"
console.log('\nשלב 3: טיפול מיוחד ב-social_organizations...');
// This one stays as-is since it already has @@map("organizations")

if (content === originalContent) {
  console.log('\n⚠️  לא בוצעו שינויים!');
  process.exit(0);
}

// Create backup
const backupPath = schemaPath + '.backup-' + Date.now();
fs.writeFileSync(backupPath, originalContent, 'utf-8');
console.log(`\n💾 גיבוי נשמר ב: ${backupPath}`);

// Write updated schema
fs.writeFileSync(schemaPath, content, 'utf-8');

console.log(`\n✅ הושלם בהצלחה!`);
console.log(`   מודלים שונו: ${modelsRenamed}`);
console.log(`   קשרים עודכנו: ${relationsUpdated}`);

console.log('\n📋 צעדים הבאים:');
console.log('  1. הרץ: npx prisma format');
console.log('  2. הרץ: npx prisma validate');
console.log('  3. בדוק: git diff prisma/schema.prisma');
console.log('  4. הרץ את ה-migration:');
console.log('     npx prisma migrate deploy');
console.log('\n⚠️  שים לב: תצטרך לעדכן קוד TypeScript שמשתמש במודלים אלה!');
