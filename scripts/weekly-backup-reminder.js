#!/usr/bin/env node
/**
 * Weekly Backup Reminder
 * Checks last backup date and reminds if needed
 */

const fs = require('fs');
const path = require('path');

function main() {
  const backupDir = path.join(__dirname, '..', 'backups');
  
  if (!fs.existsSync(backupDir)) {
    console.log('\n⚠️  אין גיבויים!\n');
    console.log('💡 צור גיבוי עכשיו: npm run db:backup\n');
    return;
  }
  
  const backups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (backups.length === 0) {
    console.log('\n⚠️  אין גיבויים!\n');
    console.log('💡 צור גיבוי עכשיו: npm run db:backup\n');
    return;
  }
  
  // Get latest backup
  const latestBackup = backups[0];
  const backupPath = path.join(backupDir, latestBackup);
  const stats = fs.statSync(backupPath);
  const backupDate = new Date(stats.mtime);
  const now = new Date();
  const daysSince = Math.floor((now - backupDate) / (1000 * 60 * 60 * 24));
  
  console.log('\n📊 מצב גיבויים:\n');
  console.log(`📅 גיבוי אחרון: ${backupDate.toLocaleString('he-IL')}`);
  console.log(`⏰ לפני: ${daysSince} ימים\n`);
  
  if (daysSince === 0) {
    console.log('✅ יש לך גיבוי מהיום - מעולה!\n');
  } else if (daysSince <= 7) {
    console.log('✅ הגיבוי עדכני יחסית (פחות משבוע)\n');
  } else if (daysSince <= 30) {
    console.log('⚠️  הגיבוי בן יותר משבוע!\n');
    console.log('💡 מומלץ ליצור גיבוי חדש: npm run db:backup\n');
  } else {
    console.log('🚨 הגיבוי ישן מאוד (יותר מחודש)!\n');
    console.log('❗ צור גיבוי חדש עכשיו: npm run db:backup\n');
  }
  
  console.log(`📦 סה"כ גיבויים: ${backups.length}\n`);
  console.log('📖 מדריך מלא: אזהרת-מחיקת-פרויקט.md\n');
}

main();
