#!/usr/bin/env node
/**
 * Pre-Migration Safety Check
 * Run this before ANY Prisma migration to prevent data loss
 */

require('dotenv').config({ path: '.env' });
try { require('dotenv').config({ path: '.env.local' }); } catch {}

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Pre-Migration Safety Check\n');
  
  try {
    // 1. Check environment
    if (process.env.NODE_ENV === 'production') {
      console.log('❌ FAIL: Running in PRODUCTION environment');
      console.log('   Never run `prisma migrate dev` in production!\n');
      process.exit(1);
    }
    console.log('✅ Environment: development');
    
    // 2. Check for pending migrations
    const migrations = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema='public' AND table_name='_prisma_migrations'
      ) AS has_table
    `);
    
    if (migrations[0].has_table) {
      const pending = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::int as count 
        FROM _prisma_migrations 
        WHERE finished_at IS NULL
      `);
      
      if (pending[0].count > 0) {
        console.log('⚠️  WARNING: Found pending/failed migrations');
        console.log('   Resolve these before creating new ones.\n');
      } else {
        console.log('✅ No pending migrations');
      }
    }
    
    // 3. Check data count
    const orgs = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int as c FROM organizations');
    const users = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int as c FROM organization_users');
    
    console.log(`✅ Data count: ${orgs[0].c} orgs, ${users[0].c} users`);
    
    if (orgs[0].c > 0 || users[0].c > 0) {
      console.log('\n⚠️  DATABASE HAS DATA!');
      console.log('   REQUIRED: Create backup before migration');
      console.log('   Run: npm run db:backup:critical\n');
      
      // Check if backup script exists
      const backupScript = path.join(__dirname, 'db-backup-critical.sql');
      if (fs.existsSync(backupScript)) {
        console.log('✅ Backup script available');
      } else {
        console.log('⚠️  Backup script not found!');
      }
    }
    
    // 4. Check schema drift
    console.log('\n📋 Checking schema drift...');
    const { execSync } = require('child_process');
    
    try {
      const output = execSync('npx prisma migrate status', { 
        encoding: 'utf8',
        env: process.env
      });
      
      if (output.includes('Database schema is up to date')) {
        console.log('✅ Schema is in sync');
      } else if (output.includes('drift detected')) {
        console.log('⚠️  Schema drift detected');
        console.log('   Review changes carefully before migrating');
      }
    } catch (error) {
      // Migration status failed - might be first migration
      console.log('ℹ️  No migration history found');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🛡️  רשימת בדיקות לפני מיגריישן:');
    console.log('='.repeat(60));
    console.log('[ ] 1. גיבוי נוצר (npm run db:backup:critical)');
    console.log('[ ] 2. שינויי הסכמה נבדקו');
    console.log('[ ] 3. שם המיגריישן מתאר');
    console.log('[ ] 4. לא רץ בפרודקשן');
    console.log('[ ] 5. מוכן להמשיך\n');
    
    console.log('📖 מדריך בטיחות מלא: c:\\Projects\\Misrad-AI\\מדריך-בטיחות.md\n');
    console.log('✅ בדיקת בטיחות הושלמה!\n');
    console.log('💡 השתמש ב: npm run migrate:safe <שם-מיגריישן>\n');
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
