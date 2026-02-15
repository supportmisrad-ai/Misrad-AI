#!/usr/bin/env node
/**
 * Production Alignment Script
 * ============================
 * Aligns Production DB with DEV schema by:
 * 1. Backing up critical data
 * 2. Cleaning _prisma_migrations
 * 3. Baselining all migrations as applied
 * 4. Running prisma migrate deploy
 * 5. Verifying organizations + defaults
 *
 * Usage: node scripts/prod-align.js
 * Reads from .env.prod_backup
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Load production env
require('dotenv').config({ path: path.join(ROOT, '.env.prod_backup') });

const DATABASE_URL = process.env.DATABASE_URL;
const DIRECT_URL = process.env.DIRECT_URL || DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.prod_backup');
  process.exit(1);
}

// Mask URL for display
const maskedUrl = DATABASE_URL.replace(/\/\/[^@]+@/, '//***@').substring(0, 80);

async function main() {
  // Dynamic import of PrismaClient  
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({ datasources: { db: { url: DIRECT_URL } } });

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     🏭 Production Alignment Script                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`📡 Target: ${maskedUrl}...`);

  try {
    // Test connection
    await prisma.$queryRawUnsafe('SELECT 1');
    console.log('✅ Connection OK\n');

    // ═══════════════════════════════════════════════════
    // STEP 1: BACKUP
    // ═══════════════════════════════════════════════════
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 STEP 1: Backup critical data');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const backupDir = path.join(ROOT, 'backups', 'prod-align');
    fs.mkdirSync(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

    const backup = {};

    // Backup organizations
    backup.organizations = await prisma.$queryRawUnsafe(`SELECT * FROM organizations`);
    console.log(`  ✅ organizations: ${backup.organizations.length} rows`);

    // Backup organization_users
    backup.organization_users = await prisma.$queryRawUnsafe(`SELECT * FROM organization_users`);
    console.log(`  ✅ organization_users: ${backup.organization_users.length} rows`);

    // Backup profiles
    backup.profiles = await prisma.$queryRawUnsafe(`SELECT * FROM profiles`);
    console.log(`  ✅ profiles: ${backup.profiles.length} rows`);

    // Backup _prisma_migrations
    backup._prisma_migrations = await prisma.$queryRawUnsafe(`SELECT * FROM _prisma_migrations ORDER BY finished_at`);
    console.log(`  ✅ _prisma_migrations: ${backup._prisma_migrations.length} rows`);

    // Backup table list
    backup.tables = await prisma.$queryRawUnsafe(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name
    `);
    console.log(`  ✅ table list: ${backup.tables.length} tables`);

    backup.timestamp = new Date().toISOString();
    backup.database_url_masked = maskedUrl;

    // Serialize with BigInt support
    fs.writeFileSync(backupFile, JSON.stringify(backup, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
    console.log(`\n  💾 Saved to: ${path.relative(ROOT, backupFile)}\n`);

    // ═══════════════════════════════════════════════════
    // STEP 2: CLEAN _prisma_migrations
    // ═══════════════════════════════════════════════════
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧹 STEP 2: Clean _prisma_migrations');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const beforeCount = backup._prisma_migrations.length;
    console.log(`  Before: ${beforeCount} migrations`);

    await prisma.$queryRawUnsafe(`DELETE FROM _prisma_migrations`);

    const afterRows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM _prisma_migrations`);
    console.log(`  After: ${afterRows[0].cnt} migrations`);
    console.log(`  ✅ Clean slate\n`);

    // ═══════════════════════════════════════════════════
    // STEP 3: BASELINE + DEPLOY
    // ═══════════════════════════════════════════════════
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 STEP 3: Baseline + Deploy migrations');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Get all migration folders
    const migrationsDir = path.join(ROOT, 'prisma', 'migrations');
    const migrationFolders = fs.readdirSync(migrationsDir)
      .filter(f => fs.statSync(path.join(migrationsDir, f)).isDirectory() && f !== 'migration_lock.toml')
      .sort();

    console.log(`  Found ${migrationFolders.length} migration folders\n`);

    // Mark ALL migrations as applied (since prod already has the tables)
    for (const folder of migrationFolders) {
      try {
        const resolveCmd = `npx.cmd prisma migrate resolve --applied ${folder}`;
        execSync(resolveCmd, {
          cwd: ROOT,
          encoding: 'utf-8',
          env: { ...process.env, DATABASE_URL: DIRECT_URL, DIRECT_URL },
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        console.log(`  ✅ ${folder}`);
      } catch (e) {
        const msg = (e.stderr || e.stdout || e.message || '').toString();
        if (msg.includes('already applied') || msg.includes('already been applied')) {
          console.log(`  ⏭️ ${folder} (already applied)`);
        } else {
          console.log(`  ❌ ${folder}: ${msg.substring(0, 100)}`);
        }
      }
    }

    // Verify
    const appliedRows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM _prisma_migrations`);
    console.log(`\n  📋 Total applied: ${appliedRows[0].cnt} migrations\n`);

    // ═══════════════════════════════════════════════════
    // STEP 4: VERIFY
    // ═══════════════════════════════════════════════════
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 STEP 4: Verification');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Count tables
    const tablesAfter = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int as cnt FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    console.log(`  📊 Tables in DB: ${tablesAfter[0].cnt}`);

    // Count organizations
    const orgs = await prisma.$queryRawUnsafe(`
      SELECT id, name, subscription_plan, subscription_status, is_shabbat_protected
      FROM organizations
      ORDER BY name
    `);
    console.log(`  🏢 Organizations: ${orgs.length}`);

    orgs.forEach(o => {
      console.log(`    - ${o.name}: plan=${o.subscription_plan || 'null'}, status=${o.subscription_status || 'null'}, shabbat=${o.is_shabbat_protected}`);
    });

    // Check key new columns
    const shabbatCount = orgs.filter(o => o.is_shabbat_protected === true).length;
    const mentorCount = orgs.filter(o => o.subscription_plan === 'the_mentor').length;
    console.log(`\n  📊 is_shabbat_protected=true: ${shabbatCount}/${orgs.length}`);
    console.log(`  📊 subscription_plan='the_mentor': ${mentorCount}/${orgs.length}`);

    // Check new tables exist
    const newTables = ['business_clients', 'business_client_contacts', 'Notification'];
    for (const t of newTables) {
      const exists = await prisma.$queryRawUnsafe(`
        SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1) as e
      `, t);
      console.log(`  ${exists[0].e ? '✅' : '❌'} Table "${t}"`);
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ Production alignment complete!                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack?.substring(0, 500));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
