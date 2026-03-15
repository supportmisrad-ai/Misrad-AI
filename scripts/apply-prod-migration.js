const fs = require('fs');
const dotenv = require('dotenv');
const { execSync } = require('child_process');

console.log('🔒 PROD Migration - Safe Mode');
console.log('==============================\n');

// Load PROD env
const prodContent = fs.readFileSync('.env.prod_backup', 'utf8');
const prodEnv = dotenv.parse(prodContent);

console.log('מצב PROD:');
console.log('  Database:', prodEnv.DIRECT_URL?.split('@')[1]?.split('/')[0] || 'unknown');
console.log('  Direct URL: ✅ מוגדר');
console.log();

// Safety checks
console.log('🛡️  בדיקות בטיחות:');
console.log('  1. בודק אם הטבלאות כבר קיימות...');

process.env.DATABASE_URL = prodEnv.DIRECT_URL;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runMigration() {
  try {
    // Check if tables already exist
    const tablesToCreate = ['impersonation_audit_logs', 'partner_link_usage'];
    const existing = [];
    
    for (const table of tablesToCreate) {
      const result = await prisma.$queryRaw`SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = ${table}
      ) as e`;
      if (result[0].e) {
        existing.push(table);
      }
    }
    
    if (existing.length > 0) {
      console.log(`     ✅ טבלאות כבר קיימות: ${existing.join(', ')}`);
      console.log('     אין צורך במיגרציה.\n');
      await prisma.$disconnect();
      process.exit(0);
    }
    
    console.log('     ✅ טבלאות חסרות - ממשיך עם מיגרציה\n');
    
    // Read migration SQL
    const migrationPath = 'prisma/migrations/20260315150000_add_missing_prod_tables/migration.sql';
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 מריץ מיגרציה...');
    console.log('   טבלאות ליצירה:', tablesToCreate.join(', '));
    console.log();
    
    // Execute migration
    await prisma.$executeRawUnsafe(sql);
    
    console.log('✅ מיגרציה הושלמה בהצלחה!\n');
    
    // Verify
    console.log('🔍 מאמת יצירת טבלאות...');
    for (const table of tablesToCreate) {
      const result = await prisma.$queryRaw`SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = ${table}
      ) as e`;
      console.log(`   ${table}: ${result[0].e ? '✅ נוצרה' : '❌ לא נוצרה'}`);
    }
    
    // Add migration record
    await prisma.$executeRaw`
      INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
      VALUES (
        gen_random_uuid(),
        'manual',
        NOW(),
        '20260315150000_add_missing_prod_tables',
        NOW(),
        1
      )
      ON CONFLICT DO NOTHING
    `;
    console.log('\n   _prisma_migrations: ✅ עודכן\n');
    
    await prisma.$disconnect();
    console.log('🎉 הכל הושלם!');
    
  } catch (error) {
    console.error('\n❌ שגיאה:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

runMigration();
