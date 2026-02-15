require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const tables = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log(`\n📊 Total tables in DEV DB: ${tables.length}\n`);

    // Check for key tables
    const keyTables = [
      'organizations', 'organization_users', 'profiles',
      'notifications', 'Notification',
      'business_clients', 'business_client_contacts',
      'client_clients', 'system_leads', 'system_invoices',
      'nexus_users', 'nexus_tasks', 'nexus_time_entries',
      '_prisma_migrations'
    ];
    
    const tableNames = new Set(tables.map(t => t.table_name));
    console.log('🔑 Key tables check:');
    keyTables.forEach(t => {
      const exists = tableNames.has(t);
      console.log(`  ${exists ? '✅' : '❌'} ${t}`);
    });

    // Count Prisma migrations
    const migrations = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int as cnt FROM _prisma_migrations WHERE finished_at IS NOT NULL
    `);
    console.log(`\n📋 Applied migrations: ${migrations[0].cnt}`);

    // List all tables
    console.log(`\n📋 All ${tables.length} tables:`);
    tables.forEach(t => console.log(`  - ${t.table_name}`));
  } finally {
    await prisma.$disconnect();
  }
}
main().catch(e => { console.error(e.message); process.exit(1); });
