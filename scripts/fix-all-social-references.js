#!/usr/bin/env node
/**
 * Ultra-comprehensive script to fix ALL social_ references in codebase
 * Covers: SQL queries, Prisma calls, scripts, and more
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Prisma model name changes (for code using prisma.model_name)
const PRISMA_MODEL_REPLACEMENTS = {
  'prisma.social_users': 'prisma.organizationUser',
  'prisma.social_organizations': 'prisma.social_organizations', // stays same (already has @@map)
  'prisma.social_clients': 'prisma.socialMediaClient',
  'prisma.social_team_members': 'prisma.teamMember',
  'prisma.social_team_member_clients': 'prisma.teamMemberClient',
  'prisma.social_team_comments': 'prisma.teamComment',
  'prisma.social_notifications': 'prisma.notification',
  'prisma.social_impersonation_sessions': 'prisma.impersonationSession',
  'prisma.social_activity_logs': 'prisma.activityLog',
  // Add more as needed
};

// SQL table name changes (for raw SQL queries)
const SQL_TABLE_REPLACEMENTS = {
  'FROM social_users': 'FROM organization_users',
  'from social_users': 'from organization_users',
  'JOIN social_users': 'JOIN organization_users',
  'join social_users': 'join organization_users',
  'INTO social_users': 'INTO organization_users',
  'into social_users': 'into organization_users',
  'TABLE social_users': 'TABLE organization_users',
  'table social_users': 'table organization_users',
  
  'FROM social_clients': 'FROM socialmedia_clients',
  'from social_clients': 'from socialmedia_clients',
  'JOIN social_clients': 'JOIN socialmedia_clients',
  'join social_clients': 'join socialmedia_clients',
  'TABLE social_clients': 'TABLE socialmedia_clients',
  'table social_clients': 'table socialmedia_clients',
  
  'FROM social_team_members': 'FROM team_members',
  'from social_team_members': 'from team_members',
  'JOIN social_team_members': 'JOIN team_members',
  'join social_team_members': 'join team_members',
};

// String literal replacements (for table name strings)
const STRING_REPLACEMENTS = {
  "'social_users'": "'organization_users'",
  '"social_users"': '"organization_users"',
  '`social_users`': '`organization_users`',
  
  "'social_clients'": "'socialmedia_clients'",
  '"social_clients"': '"socialmedia_clients"',
  '`social_clients`': '`socialmedia_clients`',
  
  "'social_team_members'": "'team_members'",
  '"social_team_members"': '"team_members"',
  '`social_team_members`': '`team_members`',
};

console.log('🔍 מחפש קבצים שצריכים עדכון...\n');

// Find all files that might need updates
const filesToCheck = [
  ...execSync('git ls-files "*.js" "*.cjs" "*.ts" "*.tsx"', { encoding: 'utf-8' })
    .split('\n')
    .filter(Boolean)
    .filter(f => !f.includes('node_modules'))
    .filter(f => !f.includes('.next'))
    .filter(f => !f.includes('scripts/fix-'))
    .filter(f => !f.includes('scripts/migrate-schema'))
    .filter(f => !f.includes('scripts/update-schema')),
];

let filesUpdated = 0;
let totalReplacements = 0;

for (const file of filesToCheck) {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) continue;
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  const original = content;
  let fileReplacements = 0;
  
  // Apply Prisma model replacements
  for (const [oldName, newName] of Object.entries(PRISMA_MODEL_REPLACEMENTS)) {
    const regex = new RegExp(oldName.replace('.', '\\.'), 'g');
    const matches = content.match(regex);
    if (matches) {
      content = content.replace(regex, newName);
      fileReplacements += matches.length;
    }
  }
  
  // Apply SQL table replacements
  for (const [oldPattern, newPattern] of Object.entries(SQL_TABLE_REPLACEMENTS)) {
    const regex = new RegExp(oldPattern, 'g');
    const matches = content.match(regex);
    if (matches) {
      content = content.replace(regex, newPattern);
      fileReplacements += matches.length;
    }
  }
  
  // Apply string literal replacements
  for (const [oldStr, newStr] of Object.entries(STRING_REPLACEMENTS)) {
    const regex = new RegExp(oldStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = content.match(regex);
    if (matches) {
      content = content.replace(regex, newStr);
      fileReplacements += matches.length;
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
console.log('\n📋 צעדים הבאים:');
console.log('  1. בדוק: git diff');
console.log('  2. הרץ: npm run typecheck');
console.log('  3. בדוק שהאפליקציה עובדת');
