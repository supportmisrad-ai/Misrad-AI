#!/usr/bin/env node
/**
 * Apply sync_full_prod_schema migration to Production
 * 1. Remove the "applied" marker for sync_full_prod_schema
 * 2. Run prisma migrate deploy to actually execute it
 * 3. Verify new tables exist
 */
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env.prod_backup') });

const DIRECT_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!DIRECT_URL) { console.error('❌ No DB URL'); process.exit(1); }

const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient({ datasources: { db: { url: DIRECT_URL } } });

  try {
    console.log('\n🔧 Step 1: Remove sync_full_prod_schema from _prisma_migrations...');
    await prisma.$queryRawUnsafe(
      `DELETE FROM _prisma_migrations WHERE migration_name LIKE '%sync_full_prod_schema%'`
    );
    
    const remaining = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM _prisma_migrations`);
    console.log(`   ✅ Removed. Remaining migrations: ${remaining[0].cnt}`);
    
    await prisma.$disconnect();

    console.log('\n🚀 Step 2: Running prisma migrate deploy...\n');
    const result = execSync('npx.cmd prisma migrate deploy', {
      cwd: ROOT,
      encoding: 'utf-8',
      env: { ...process.env, DATABASE_URL: DIRECT_URL, DIRECT_URL },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log(result);

    console.log('🔍 Step 3: Verifying new tables...\n');
    const prisma2 = new PrismaClient({ datasources: { db: { url: DIRECT_URL } } });
    
    const newTables = ['business_clients', 'business_client_contacts', 'Notification'];
    for (const t of newTables) {
      const exists = await prisma2.$queryRawUnsafe(`
        SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1) as e
      `, t);
      console.log(`  ${exists[0].e ? '✅' : '❌'} ${t}`);
    }

    const totalTables = await prisma2.$queryRawUnsafe(`
      SELECT COUNT(*)::int as cnt FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    console.log(`\n  📊 Total tables: ${totalTables[0].cnt}`);

    const totalMigrations = await prisma2.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM _prisma_migrations`);
    console.log(`  📋 Total migrations: ${totalMigrations[0].cnt}`);

    // Verify orgs still intact
    const orgs = await prisma2.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM organizations`);
    console.log(`  🏢 Organizations: ${orgs[0].cnt}`);

    await prisma2.$disconnect();
    console.log('\n✅ Done!\n');
  } catch (e) {
    console.error('❌ Error:', e.message);
    if (e.stderr) console.error('STDERR:', e.stderr.toString().substring(0, 1000));
    process.exit(1);
  }
}

main();
