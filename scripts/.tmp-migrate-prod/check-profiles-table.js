/**
 * Check if profiles table exists in production DB
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

function loadDirectUrl() {
  const envPath = path.resolve(__dirname, '../../.env.prod_backup');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.prod_backup not found');
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const match = line.match(/^DIRECT_URL\s*=\s*"?(.+?)"?\s*$/);
    if (match) return match[1];
  }
  for (const line of content.split('\n')) {
    const match = line.match(/^DATABASE_URL\s*=\s*"?(.+?)"?\s*$/);
    if (match) return match[1];
  }
  throw new Error('DIRECT_URL/DATABASE_URL not found in .env.prod_backup');
}

async function main() {
  const directUrl = loadDirectUrl();
  console.log('Connecting to production DB...');
  console.log('Host:', directUrl.replace(/\/\/.*?@/, '//***@'));

  const prisma = new PrismaClient({
    datasources: { db: { url: directUrl } },
  });

  try {
    // Check if profiles table exists
    const result = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles'
      );
    `);
    
    const exists = result[0]?.exists;
    console.log('\n✓ profiles table exists:', exists);

    if (!exists) {
      console.log('\n❌ profiles table MISSING in production!');
      console.log('Need to create it from the init migration.');
    } else {
      // Show table structure
      const cols = await prisma.$queryRawUnsafe(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
        ORDER BY ordinal_position
      `);
      console.log('\nprofiles table columns:');
      for (const col of cols) {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      }
    }

    // Also check for organization_users (previously social_users)
    const orgUsersExists = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'organization_users'
      );
    `);
    console.log('\n✓ organization_users table exists:', orgUsersExists[0]?.exists);

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.meta) console.error('Meta:', JSON.stringify(err.meta, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
