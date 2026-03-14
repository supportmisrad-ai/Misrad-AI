#!/usr/bin/env node
/**
 * Add competition fields to system_partners table
 * - referrals_this_month
 * - last_month_reset
 * - total_earned
 */
const { PrismaClient } = require('@prisma/client');

async function runMigration(envFile) {
  require('dotenv').config({ path: envFile });
  const prisma = new PrismaClient();
  
  const env = envFile.includes('prod') ? 'PROD' : 'DEV';
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Migration: SystemPartner competition fields (${env})`);
  console.log(`${'='.repeat(60)}\n`);
  
  try {
    // Add referrals_this_month
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE system_partners ADD COLUMN IF NOT EXISTS referrals_this_month INTEGER DEFAULT 0;`);
      console.log('✅ Added referrals_this_month');
    } catch (err) {
      if (err.code === '42701') console.log('⏭️  referrals_this_month already exists');
      else throw err;
    }
    
    // Add last_month_reset
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE system_partners ADD COLUMN IF NOT EXISTS last_month_reset TIMESTAMPTZ;`);
      console.log('✅ Added last_month_reset');
    } catch (err) {
      if (err.code === '42701') console.log('⏭️  last_month_reset already exists');
      else throw err;
    }
    
    // Add total_earned
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE system_partners ADD COLUMN IF NOT EXISTS total_earned DECIMAL(10,2) DEFAULT 0;`);
      console.log('✅ Added total_earned');
    } catch (err) {
      if (err.code === '42701') console.log('⏭️  total_earned already exists');
      else throw err;
    }
    
    console.log(`\n✅ ${env} migration completed!\n`);
    return true;
  } catch (err) {
    console.error(`\n❌ ${env} migration failed:`, err.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  // DEV
  const devOk = await runMigration('.env.local');
  
  // PROD
  const prodOk = await runMigration('.env.prod_backup');
  
  console.log('\n' + '='.repeat(60));
  console.log('  Summary');
  console.log('='.repeat(60));
  console.log(`  DEV:  ${devOk ? '✅ Success' : '❌ Failed'}`);
  console.log(`  PROD: ${prodOk ? '✅ Success' : '❌ Failed'}`);
  console.log('='.repeat(60) + '\n');
  
  if (!devOk || !prodOk) process.exit(1);
}

main();
