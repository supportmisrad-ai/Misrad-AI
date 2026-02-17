#!/usr/bin/env node
/**
 * Automatic Database Backup System
 * Creates timestamped backups of critical data
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadEnvFile(filePath, override) {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) return;
  dotenv.config({ path: fullPath, override: Boolean(override) });
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
  loadEnvFile(explicitEnv, true);
} else {
  loadEnvFile('.env', false);
  loadEnvFile('.env.local', true);
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const backupDir = path.join(__dirname, '..', 'backups');
  
  // Create backups directory if not exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log('📁 יצירת תיקיית גיבויים: backups/\n');
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
  
  console.log('🔄 יוצר גיבוי...\n');
  console.log(`📅 תאריך: ${new Date().toLocaleString('he-IL')}`);
  console.log(`📂 קובץ: ${backupFile}\n`);
  
  try {
    // Backup organizations
    console.log('📊 מגבה ארגונים...');
    const organizations = await prisma.organization.findMany({
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            full_name: true,
            role: true
          }
        }
      }
    });
    console.log(`   ✅ ${organizations.length} ארגונים\n`);
    
    // Backup users
    console.log('👥 מגבה משתמשים...');
    const users = await prisma.organizationUser.findMany();
    console.log(`   ✅ ${users.length} משתמשים\n`);
    
    // Backup profiles
    console.log('📋 מגבה פרופילים...');
    const profiles = await prisma.profile.findMany();
    console.log(`   ✅ ${profiles.length} פרופילים\n`);
    
    // Identify DB target for auditing
    const dbUrl = process.env.DATABASE_URL || '';
    let dbIdentity = {
      host: null,
      port: null,
      database: null,
      user: null,
    };
    try {
      const u = new URL(dbUrl);
      dbIdentity = {
        host: u.hostname,
        port: u.port || '5432',
        database: (u.pathname || '').replace(/^\//, '') || null,
        user: u.username || null,
      };
    } catch {}
 
    // Create backup object
    const backup = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: dbIdentity.host ? `${dbIdentity.host}:${dbIdentity.port}/${dbIdentity.database}` : 'unknown',
        database_identity: dbIdentity,
        counts: {
          organizations: organizations.length,
          users: users.length,
          profiles: profiles.length
        }
      },
      data: {
        organizations,
        users,
        profiles
      }
    };
    
    // Write to file with BigInt support
    fs.writeFileSync(backupFile, JSON.stringify(backup, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2), 'utf-8');
    
    console.log('✅ גיבוי הושלם בהצלחה!\n');
    console.log('📊 סיכום:');
    console.log(`   ארגונים: ${organizations.length}`);
    console.log(`   משתמשים: ${users.length}`);
    console.log(`   פרופילים: ${profiles.length}`);
    console.log(`   גודל קובץ: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB\n`);
    
    // Clean old backups (keep last 30)
    const backups = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .sort()
      .reverse();
    
    if (backups.length > 30) {
      console.log('🧹 מנקה גיבויים ישנים...');
      backups.slice(30).forEach(oldBackup => {
        fs.unlinkSync(path.join(backupDir, oldBackup));
        console.log(`   🗑️  נמחק: ${oldBackup}`);
      });
      console.log('');
    }
    
    console.log('💾 הגיבוי נשמר ב:');
    console.log(`   ${backupFile}\n`);
    
  } catch (error) {
    console.error('\n❌ שגיאה ביצירת גיבוי:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
