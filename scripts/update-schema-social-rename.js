#!/usr/bin/env node
/**
 * Script to update schema.prisma with renamed social_ tables
 * Updates model names and @@map directives
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

// Mapping: old table name -> new table name
const TABLE_RENAMES = {
  // Core tables
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
  
  // Social Media tables
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

console.log('🔄 מעדכן schema.prisma...\n');

let content = fs.readFileSync(schemaPath, 'utf-8');
let changesCount = 0;

// Update each model
for (const [oldName, newName] of Object.entries(TABLE_RENAMES)) {
  // Update model declaration: model social_xxx { -> model social_xxx {
  // and add @@map("new_name") if not exists
  
  const modelRegex = new RegExp(`^model ${oldName} \\{`, 'gm');
  const matches = content.match(modelRegex);
  
  if (matches) {
    console.log(`  📝 מעדכן: ${oldName} -> ${newName}`);
    
    // Check if @@map already exists for this model
    const mapRegex = new RegExp(`model ${oldName} \\{[\\s\\S]*?@@map\\("([^"]+)"\\)`, 'm');
    const mapMatch = content.match(mapRegex);
    
    if (mapMatch) {
      // Update existing @@map
      content = content.replace(
        new RegExp(`(model ${oldName} \\{[\\s\\S]*?)@@map\\("${mapMatch[1]}"\\)`, 'm'),
        `$1@@map("${newName}")`
      );
    } else {
      // Add @@map before closing brace
      content = content.replace(
        new RegExp(`(model ${oldName} \\{[\\s\\S]*?)(\\n\\})`, 'm'),
        `$1\n  @@map("${newName}")$2`
      );
    }
    
    changesCount++;
  }
}

// Write back
fs.writeFileSync(schemaPath, content, 'utf-8');

console.log(`\n✅ עודכנו ${changesCount} models`);
console.log('📄 הקובץ schema.prisma עודכן בהצלחה\n');

console.log('⚠️  שים לב:');
console.log('  1. הרץ: npx prisma format');
console.log('  2. הרץ: npx prisma validate');
console.log('  3. בדוק את השינויים ב-git diff\n');
