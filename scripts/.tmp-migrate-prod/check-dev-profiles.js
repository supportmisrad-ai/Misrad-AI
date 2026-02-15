/**
 * Check if profiles table exists in DEV database (from .env.local)
 */
const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('Checking DEV database for profiles table...\n');
  
  const prisma = new PrismaClient();

  try {
    const result = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles'
      );
    `);
    
    const exists = result[0]?.exists;
    console.log('✓ profiles table exists in DEV:', exists);

    if (!exists) {
      console.log('\n❌ profiles table MISSING in DEV database!');
      console.log('This is causing the 500 errors you see in the screenshot.');
      console.log('\nNeed to run the init migration or create profiles table manually.');
    } else {
      const cols = await prisma.$queryRawUnsafe(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
        ORDER BY ordinal_position
      `);
      console.log('\nprofiles table columns in DEV:');
      for (const col of cols) {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      }
    }

    // Check which migrations have been applied
    const migrations = await prisma.$queryRawUnsafe(`
      SELECT migration_name, finished_at
      FROM _prisma_migrations
      ORDER BY finished_at DESC
      LIMIT 5
    `);
    console.log('\nLast 5 migrations applied to DEV:');
    for (const m of migrations) {
      console.log(`  - ${m.migration_name} (${m.finished_at ? new Date(m.finished_at).toISOString() : 'N/A'})`);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.code) console.error('Code:', err.code);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
