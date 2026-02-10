#!/usr/bin/env node
/**
 * Fix field names in schema after model rename
 * Updates relation field names to match new model names
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

// Field name replacements (exact old field name -> new field name)
const FIELD_RENAMES = {
  'social_post_comments': 'postComments',
  'social_post_platforms': 'postPlatforms',
  'social_post_variations': 'postVariations',
  'social_user_update_views': 'userUpdateViews',
  'social_messages': 'messages',
  'social_clients': 'socialMediaClients',
  'social_team_members': 'teamMembers',
  'social_users': 'organizationUsers',
  'social_activity_logs': 'activityLogs',
  'social_team_comments': 'teamComments',
  'social_team_member_clients': 'teamMemberClients',
};

// Type name replacements
const TYPE_RENAMES = {
  'social_post_comments': 'SocialMediaPostComment',
  'social_post_platforms': 'SocialMediaPostPlatform',
  'social_post_variations': 'SocialMediaPostVariation',
  'social_user_update_views': 'UserUpdateView',
  'social_messages': 'SocialMediaMessage',
  'social_clients': 'SocialMediaClient',
  'social_team_members': 'TeamMember',
  'social_users': 'OrganizationUser',
  'social_activity_logs': 'ActivityLog',
  'social_team_comments': 'TeamComment',
  'social_team_member_clients': 'TeamMemberClient',
};

console.log('🔧 מתקן שמות שדות ב-schema...\n');

let content = fs.readFileSync(schemaPath, 'utf-8');
let fixed = 0;

for (const [oldName, newFieldName] of Object.entries(FIELD_RENAMES)) {
  const newTypeName = TYPE_RENAMES[oldName];
  
  // Pattern: fieldName OldType[] or fieldName OldType?
  const patterns = [
    new RegExp(`\\s+${oldName}\\s+${oldName}\\[\\]`, 'g'),
    new RegExp(`\\s+${oldName}\\s+${oldName}\\?`, 'g'),
    new RegExp(`\\s+${oldName}\\s+${oldName}\\s+@relation`, 'g'),
  ];
  
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      // Replace: old_name old_name[] -> newFieldName NewType[]
      content = content.replace(
        new RegExp(`(\\s+)${oldName}(\\s+)${oldName}(\\[\\]|\\?)?`, 'g'),
        `$1${newFieldName}$2${newTypeName}$3`
      );
      fixed += matches.length;
      console.log(`  ✅ ${oldName} -> ${newFieldName}: ${newTypeName}`);
    }
  }
}

fs.writeFileSync(schemaPath, content, 'utf-8');

console.log(`\n✅ תוקנו ${fixed} שדות`);
console.log('הרץ עכשיו: npx prisma format\n');
