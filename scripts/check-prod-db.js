const fs = require('fs');
const dotenv = require('dotenv');

// Load PROD env
const prodContent = fs.readFileSync('.env.prod_backup', 'utf8');
const prodEnv = dotenv.parse(prodContent);

console.log('=== PROD DB Check ===');
console.log('DATABASE_URL exists:', !!prodEnv.DATABASE_URL);
console.log('DIRECT_URL exists:', !!prodEnv.DIRECT_URL);

// Set env for Prisma
process.env.DATABASE_URL = prodEnv.DIRECT_URL; // Use DIRECT_URL for connection

const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    // Test connection
    const result = await prisma.$queryRaw`SELECT current_database() as db, version() as ver`;
    console.log('Connected to:', result[0].db);
    console.log('PostgreSQL:', result[0].ver.split(' ')[0]);
    
    // Check if _prisma_migrations table exists
    const migCheck = await prisma.$queryRaw`SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
    ) as exists`;
    console.log('\n_prisma_migrations exists:', migCheck[0].exists);
    
    // Get list of all tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    console.log('\n=== TABLES IN PROD DB ===');
    console.log('Total tables:', tables.length);
    tables.forEach(t => console.log('  -', t.table_name));
    
    // Check key tables row counts
    console.log('\n=== KEY TABLE COUNTS ===');
    const keyTables = [
      'organizations',
      'organization_users', 
      'nexusUser',
      'client_clients',
      'billing_invoices',
      'attendance_time_entries',
      'activity_logs',
      'social_media_accounts',
      'team_members',
      'tasks'
    ];
    
    for (const table of keyTables) {
      try {
        const exists = await prisma.$queryRaw`SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = ${table}
        ) as exists`;
        
        if (exists[0].exists) {
          const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as c FROM "${table}"`);
          console.log(`${table}: ${count[0].c} rows`);
        } else {
          console.log(`${table}: ❌ MISSING`);
        }
      } catch(e) {
        console.log(`${table}: ERROR - ${e.message.substring(0, 50)}`);
      }
    }
    
    await prisma.$disconnect();
    console.log('\n✅ PROD DB check complete');
  } catch(e) {
    console.log('\n❌ PROD DB Error:', e.message);
    process.exit(1);
  }
}

check();
