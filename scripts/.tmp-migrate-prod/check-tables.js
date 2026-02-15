const fs = require('fs');
const path = require('path');

const envFile = path.resolve(__dirname, '..', '..', '.env.prod_backup');
const lines = fs.readFileSync(envFile, 'utf8').split('\n');

let directUrl = '';
for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('DIRECT_URL=')) {
    directUrl = trimmed.substring('DIRECT_URL='.length).replace(/^"|"$/g, '').trim();
  }
}

process.env.DATABASE_URL = directUrl;
process.env.DIRECT_URL = directUrl;

const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: directUrl } } });

async function main() {
  // Check if organization_users exists
  const tableCheck = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
      'organization_users', 'social_users',
      'team_members', 'social_team_members',
      'team_comments', 'social_team_comments',
      'core_system_settings', 'social_system_settings',
      'notifications', 'social_notifications',
      'socialmedia_clients', 'social_clients',
      'socialmedia_posts', 'social_posts',
      'activity_logs', 'social_activity_logs'
    )
    ORDER BY table_name
  `);

  console.log('=== Tables found in production DB ===');
  tableCheck.forEach(function(r) { console.log('  ✅ ' + r.table_name); });
  
  // Check for old names specifically
  const oldNames = ['social_users', 'social_team_members', 'social_team_comments', 'social_system_settings', 'social_notifications', 'social_clients', 'social_posts', 'social_activity_logs'];
  const newNames = ['organization_users', 'team_members', 'team_comments', 'core_system_settings', 'notifications', 'socialmedia_clients', 'socialmedia_posts', 'activity_logs'];
  
  const foundNames = tableCheck.map(function(r) { return r.table_name; });
  
  console.log('\n=== Rename status ===');
  for (let i = 0; i < oldNames.length; i++) {
    const hasOld = foundNames.includes(oldNames[i]);
    const hasNew = foundNames.includes(newNames[i]);
    if (hasNew && !hasOld) {
      console.log('  ✅ ' + oldNames[i] + ' -> ' + newNames[i] + ' (renamed)');
    } else if (hasOld && !hasNew) {
      console.log('  ❌ ' + oldNames[i] + ' still exists (NOT renamed!)');
    } else if (hasOld && hasNew) {
      console.log('  ⚠️  Both ' + oldNames[i] + ' AND ' + newNames[i] + ' exist!');
    } else {
      console.log('  ❓ Neither ' + oldNames[i] + ' nor ' + newNames[i] + ' found!');
    }
  }
  
  // Count all public tables
  const allTables = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as total FROM information_schema.tables WHERE table_schema = 'public'
  `);
  console.log('\nTotal public tables:', allTables[0].total);

  await prisma.$disconnect();
}

main().catch(function(err) {
  console.error('Error:', err.message);
  process.exit(1);
});
