#!/usr/bin/env node
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
    // Step 1: Remove failed migration entry
    console.log('\n🔧 Removing failed sync_full_prod_schema entry...');
    await prisma.$queryRawUnsafe(
      `DELETE FROM _prisma_migrations WHERE migration_name LIKE '%sync_full_prod_schema%'`
    );
    const r = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM _prisma_migrations`);
    console.log(`   ✅ Done. Migrations: ${r[0].cnt}`);
    await prisma.$disconnect();

    // Step 2: Deploy
    console.log('\n🚀 Running prisma migrate deploy...\n');
    const result = execSync('npx.cmd prisma migrate deploy', {
      cwd: ROOT,
      encoding: 'utf-8',
      env: { ...process.env, DATABASE_URL: DIRECT_URL, DIRECT_URL },
    });
    console.log(result);

    // Step 3: Verify
    console.log('🔍 Verification:\n');
    const prisma2 = new PrismaClient({ datasources: { db: { url: DIRECT_URL } } });

    const tables = await prisma2.$queryRawUnsafe(`
      SELECT COUNT(*)::int as cnt FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    console.log(`  📊 Tables: ${tables[0].cnt}`);

    for (const t of ['business_clients', 'business_client_contacts', 'Notification']) {
      const exists = await prisma2.$queryRawUnsafe(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1) as e`, t
      );
      console.log(`  ${exists[0].e ? '✅' : '❌'} ${t}`);
    }

    const orgs = await prisma2.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM organizations`);
    console.log(`  🏢 Organizations: ${orgs[0].cnt}`);

    const migs = await prisma2.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM _prisma_migrations`);
    console.log(`  📋 Migrations: ${migs[0].cnt}`);

    await prisma2.$disconnect();
    console.log('\n✅ Production alignment complete!\n');
  } catch (e) {
    console.error('❌ Error:', e.message);
    if (e.stderr) console.error(e.stderr.toString().substring(0, 1500));
    process.exit(1);
  }
}
main();
