#!/usr/bin/env node
/**
 * Named Database Backup System
 * Creates timestamped backups with custom names
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const readline = require('readline');

function loadEnvFileSilent(filePath) {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) return false;
  const parsed = dotenv.parse(fs.readFileSync(fullPath));
  for (const [k, v] of Object.entries(parsed)) process.env[k] = v;
  return true;
}

function parseDbIdentity(urlValue) {
  try {
    if (!urlValue) return null;
    const u = new URL(String(urlValue));
    const port = u.port ? Number.parseInt(String(u.port), 10) : 5432;
    const database = u.pathname ? String(u.pathname).replace(/^\//, '') : '';
    return {
      host: u.hostname || null,
      port: Number.isFinite(port) ? port : 5432,
      database: database || null,
      user: u.username ? decodeURIComponent(u.username) : null,
    };
  } catch {
    return null;
  }
}

function printDbTargetToStderr() {
  const id = parseDbIdentity(process.env.DATABASE_URL);
  if (!id) {
    console.error('[named-backup] DATABASE_URL -> (missing/invalid)');
    return;
  }
  console.error(
    `[named-backup] DATABASE_URL -> host=${id.host} port=${id.port} db=${id.database ?? 'unknown'} user=${id.user ?? 'unknown'}`
  );
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
    console.error('[named-backup] .env.local not found; using process.env only.');
  }
}

printDbTargetToStderr();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  // Check if backup name was provided as argument
  let backupName = process.argv[2];
  
  // If no name provided, ask for one
  if (!backupName) {
    backupName = await new Promise(resolve => {
      rl.question('הזן שם לגיבוי (לדוגמה: "לפני-שינוי-סכימה"): ', (answer) => {
        resolve(answer || `גיבוי-${new Date().toLocaleDateString('he-IL').replace(/\//g, '-')}`);
      });
    });
  }
  
  // Sanitize backup name (remove special characters, replace spaces with dashes)
  backupName = backupName
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')  // Keep only letters, numbers, spaces, dashes
    .replace(/\s+/g, '-');
  
  const backupDir = path.join(__dirname, '..', 'backups');
  
  // Create backups directory if not exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log('📁 יצירת תיקיית גיבויים: backups/\n');
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupFile = path.join(backupDir, `backup-${timestamp}-${backupName}.json`);
  
  console.log('🔄 יוצר גיבוי מותאם אישית...\n');
  console.log(`📅 תאריך: ${new Date().toLocaleString('he-IL')}`);
  console.log(`📝 שם: ${backupName}`);
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
        name: backupName,
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
    
    // Write to file
    const json = JSON.stringify(
      backup,
      (_k, v) => (typeof v === 'bigint' ? v.toString() : v),
      2
    );
    fs.writeFileSync(backupFile, json, 'utf-8');
    
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
    
    return backupFile; // Return the backup file path for other scripts
    
  } catch (error) {
    console.error('\n❌ שגיאה ביצירת גיבוי:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

// If this script is run directly
if (require.main === module) {
  main();
} else {
  // Export for use in other scripts
  module.exports = { createNamedBackup: main };
}
