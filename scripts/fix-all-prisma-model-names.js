#!/usr/bin/env node
/**
 * Fix ALL Prisma model references to use new names
 * Comprehensive replacement covering all renamed models
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Complete mapping of old -> new Prisma model names
const PRISMA_MODELS = {
  // Core models
  'social_users': 'organizationUser',
  'social_team_members': 'teamMember',
  'social_team_member_clients': 'teamMemberClient',
  'social_team_comments': 'teamComment',
  'social_notifications': 'notification',
  'social_navigation_menu': 'navigationMenu',
  'social_impersonation_sessions': 'impersonationSession',
  'social_global_system_metrics': 'globalSystemMetric',
  'social_system_settings': 'coreSystemSettings',
  'social_system_backups': 'systemBackup',
  'social_activity_logs': 'activityLog',
  'social_integration_credentials': 'integrationCredential',
  'social_integration_status': 'integrationStatus',
  'social_oauth_tokens': 'oAuthToken',
  'social_webhook_configs': 'webhookConfig',
  'social_user_update_views': 'userUpdateView',
  'social_app_updates': 'appUpdate',
  
  // Social Media models
  'social_clients': 'socialMediaClient',
  'social_client_dna': 'socialMediaClientDna',
  'social_client_active_platforms': 'socialMediaClientPlatform',
  'social_client_requests': 'socialMediaClientRequest',
  'social_campaigns': 'socialMediaCampaign',
  'social_posts': 'socialMediaPost',
  'social_post_platforms': 'socialMediaPostPlatform',
  'social_post_variations': 'socialMediaPostVariation',
  'social_post_comments': 'socialMediaPostComment',
  'social_platform_credentials': 'socialMediaPlatformCredential',
  'social_platform_quotas': 'socialMediaPlatformQuota',
  'social_conversations': 'socialMediaConversation',
  'social_messages': 'socialMediaMessage',
  'social_ideas': 'socialMediaIdea',
  'social_automation_rules': 'socialMediaAutomationRule',
  'social_ai_opportunities': 'socialMediaAiOpportunity',
  'social_business_metrics': 'socialMediaBusinessMetric',
  'social_calendar_events': 'socialMediaCalendarEvent',
  'social_agency_service_configs': 'socialMediaAgencyConfig',
  'social_feedback': 'socialMediaFeedback',
  'social_tasks': 'socialMediaTask',
  'social_manager_requests': 'socialMediaManagerRequest',
  'social_invoices': 'socialMediaInvoice',
  'social_payment_orders': 'socialMediaPaymentOrder',
  'social_drive_files': 'socialMediaDriveFile',
  'social_sheets_sync_configs': 'socialMediaSheetsSyncConfig',
  'social_sync_logs': 'socialMediaSyncLog',
  'social_site_content': 'socialMediaSiteContent',
};

console.log('🔄 מתקן כל השימושים במודלי Prisma...\n');

const filesToCheck = execSync('git ls-files "*.ts" "*.tsx" "*.js" "*.cjs"', { encoding: 'utf-8' })
  .split('\n')
  .filter(Boolean)
  .filter(f => !f.includes('node_modules'))
  .filter(f => !f.includes('.next'))
  .filter(f => !f.includes('scripts/fix-'))
  .filter(f => !f.includes('scripts/migrate-schema'))
  .filter(f => !f.includes('scripts/update-schema'))
  .filter(f => !f.includes('prisma/schema.prisma'));

let filesUpdated = 0;
let totalReplacements = 0;

for (const file of filesToCheck) {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) continue;
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  const original = content;
  let fileReplacements = 0;
  
  // Replace prisma.old_model with prisma.newModel
  for (const [oldName, newName] of Object.entries(PRISMA_MODELS)) {
    const patterns = [
      // prisma.social_users -> prisma.organizationUser
      new RegExp(`prisma\\.${oldName}\\b`, 'g'),
      // tx.social_users -> tx.organizationUser
      new RegExp(`tx\\.${oldName}\\b`, 'g'),
      // db.social_users -> db.organizationUser
      new RegExp(`db\\.${oldName}\\b`, 'g'),
    ];
    
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, (match) => {
          const prefix = match.split('.')[0];
          return `${prefix}.${newName}`;
        });
        fileReplacements += matches.length;
      }
    }
  }
  
  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`  ✅ ${file} (${fileReplacements} replacements)`);
    filesUpdated++;
    totalReplacements += fileReplacements;
  }
}

console.log(`\n✨ הושלם!`);
console.log(`   קבצים עודכנו: ${filesUpdated}`);
console.log(`   סך החלפות: ${totalReplacements}`);
console.log('\n📋 הרץ עכשיו: npm run typecheck');
