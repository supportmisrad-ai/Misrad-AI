#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadEnvFileSilent(filePath) {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) return false;
  const parsed = dotenv.parse(fs.readFileSync(fullPath));
  for (const [k, v] of Object.entries(parsed)) process.env[k] = v;
  return true;
}

function getArgValue(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith('-')) return null;
  return v;
}

const explicitEnv = getArgValue('--env');
if (explicitEnv) {
  loadEnvFileSilent(explicitEnv);
} else {
  const loaded = loadEnvFileSilent('.env.local');
  if (!loaded) {
    console.error('[check-prisma-history] .env.local not found; using process.env only.');
  }
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('\n🔍 Checking Prisma Migration History...\n');
    
    // Check if _prisma_migrations exists
    const hasMigrations = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema='public' AND table_name='_prisma_migrations'
      ) AS exists
    `);
    
    if (!hasMigrations[0].exists) {
      console.log('❌ No _prisma_migrations table found');
      console.log('   This means Prisma has NEVER run migrations on this database.\n');
      
      // Check if tables exist
      const tables = await prisma.$queryRawUnsafe(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema='public' 
        AND table_type='BASE TABLE'
        ORDER BY table_name
      `);
      
      console.log('📊 Tables in database:');
      if (tables.length === 0) {
        console.log('   (none - completely empty DB)\n');
      } else {
        tables.forEach(t => console.log(`   - ${t.table_name}`));
        console.log('');
      }
      
      console.log('🤔 This suggests:');
      console.log('   1. This is a fresh/new database, OR');
      console.log('   2. Migrations were never run here, OR');
      console.log('   3. Someone manually dropped _prisma_migrations table\n');
      
      process.exit(0);
    }
    
    console.log('✅ _prisma_migrations table exists\n');
    
    // Get all migrations
    const allMigrations = await prisma.$queryRawUnsafe(`
      SELECT 
        migration_name,
        started_at,
        finished_at,
        rolled_back_at,
        CASE 
          WHEN finished_at IS NOT NULL THEN 'completed'
          WHEN rolled_back_at IS NOT NULL THEN 'rolled_back'
          ELSE 'failed'
        END as status
      FROM _prisma_migrations
      ORDER BY started_at DESC
    `);
    
    console.log(`📜 Found ${allMigrations.length} migrations:\n`);
    
    allMigrations.forEach((m, i) => {
      const status = m.status === 'completed' ? '✅' : 
                     m.status === 'rolled_back' ? '🔄' : '❌';
      console.log(`${status} ${m.migration_name}`);
      console.log(`   Started: ${m.started_at}`);
      if (m.finished_at) console.log(`   Finished: ${m.finished_at}`);
      if (m.rolled_back_at) console.log(`   Rolled back: ${m.rolled_back_at}`);
      console.log('');
    });
    
    // Check for the specific migration
    const trialDaysMigration = allMigrations.find(m => 
      m.migration_name.includes('trial_days_14') || 
      m.migration_name.includes('trial_days')
    );
    
    if (trialDaysMigration) {
      console.log('🎯 Found trial_days migration:');
      console.log(`   Name: ${trialDaysMigration.migration_name}`);
      console.log(`   Status: ${trialDaysMigration.status}`);
      console.log('');
    } else {
      console.log('❓ No migration with "trial_days" found\n');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
