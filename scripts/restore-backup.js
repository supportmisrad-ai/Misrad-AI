#!/usr/bin/env node
/**
 * Restore Database from Backup
 * Restores data from timestamped backup files
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
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  const backupDir = path.join(__dirname, '..', 'backups');
  
  if (!fs.existsSync(backupDir)) {
    console.log('\n❌ לא נמצאה תיקיית גיבויים!\n');
    console.log('   הרץ קודם: npm run db:backup\n');
    process.exit(1);
  }
  
  // List available backups
  const backups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (backups.length === 0) {
    console.log('\n❌ לא נמצאו גיבויים!\n');
    process.exit(1);
  }
  
  console.log('\n📦 גיבויים זמינים:\n');
  backups.forEach((backup, i) => {
    const filePath = path.join(backupDir, backup);
    const stats = fs.statSync(filePath);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    console.log(`${i + 1}. ${backup}`);
    console.log(`   תאריך: ${new Date(data.metadata.timestamp).toLocaleString('he-IL')}`);
    console.log(`   ארגונים: ${data.metadata.counts.organizations}`);
    console.log(`   משתמשים: ${data.metadata.counts.users}`);
    console.log(`   גודל: ${(stats.size / 1024).toFixed(2)} KB\n`);
  });
  
  const choiceRaw = await question('בחר מספר גיבוי לשחזור (או 0 לביטול): ');
  const choice = (choiceRaw || '').trim();
 
  if (choice === '' || choice === '0') {
    console.log('\n❌ בוטל.\n');
    process.exit(0);
  }
 
  const chosenNumber = Number.parseInt(choice, 10);
  if (!Number.isFinite(chosenNumber) || chosenNumber < 1 || chosenNumber > backups.length) {
    console.log('\n❌ בחירה לא תקינה.\n');
    process.exit(1);
  }
 
  const index = chosenNumber - 1;
  
  const selectedBackup = backups[index];
  const backupFile = path.join(backupDir, selectedBackup);
  
  console.log(`\n📂 נבחר: ${selectedBackup}\n`);
  
  // Read backup
  const backup = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
  
  console.log('⚠️  אזהרה! פעולה זו תוסיף/תעדכן נתונים בדאטאבייס!\n');
  console.log('📊 הגיבוי מכיל:');
  console.log(`   ארגונים: ${backup.data.organizations.length}`);
  console.log(`   משתמשים: ${backup.data.users.length}`);
  console.log(`   פרופילים: ${backup.data.profiles.length}\n`);
  
  const confirm = await question('להמשיך בשחזור? (כן/לא): ');
  
  if (confirm.toLowerCase() !== 'כן') {
    console.log('\n❌ בוטל.\n');
    process.exit(0);
  }
  
  console.log('\n🔄 משחזר נתונים...\n');
  
  try {
    // Restore users first (they're referenced by organizations)
    console.log('👥 משחזר משתמשים...');
    for (const user of backup.data.users) {
      await prisma.social_users.upsert({
        where: { id: user.id },
        update: user,
        create: user
      });
    }
    console.log(`   ✅ ${backup.data.users.length} משתמשים\n`);
    
    // Restore organizations
    console.log('📊 משחזר ארגונים...');
    for (const org of backup.data.organizations) {
      // Remove the owner relation from the data
      const { owner, ...orgData } = org;
      await prisma.social_organizations.upsert({
        where: { id: orgData.id },
        update: orgData,
        create: orgData
      });
    }
    console.log(`   ✅ ${backup.data.organizations.length} ארגונים\n`);
    
    // Restore profiles
    console.log('📋 משחזר פרופילים...');
    for (const profile of backup.data.profiles) {
      await prisma.profile.upsert({
        where: { id: profile.id },
        update: profile,
        create: profile
      });
    }
    console.log(`   ✅ ${backup.data.profiles.length} פרופילים\n`);
    
    console.log('✅ השחזור הושלם בהצלחה!\n');
    console.log(`📅 הגיבוי מתאריך: ${new Date(backup.metadata.timestamp).toLocaleString('he-IL')}\n`);
    
  } catch (error) {
    console.error('\n❌ שגיאה בשחזור:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main();
