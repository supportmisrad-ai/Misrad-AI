#!/usr/bin/env node
/**
 * 07-rollback.js
 * שחזור מצב מגיבוי במקרה של בעיה
 * 
 * Usage: node scripts/prod-migration-sync/07-rollback.js <backup-file>
 * Example: node scripts/prod-migration-sync/07-rollback.js backups/prod-migration-sync/backup-2026-02-15T00-00-00.json
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const prisma = new PrismaClient();

function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function rollback() {
  const backupFile = process.argv[2];
  
  if (!backupFile) {
    console.error('❌ שימוש: node scripts/prod-migration-sync/07-rollback.js <backup-file>');
    console.error('');
    console.error('דוגמה:');
    console.error('  node scripts/prod-migration-sync/07-rollback.js backups/prod-migration-sync/backup-2026-02-15T00-00-00.json');
    process.exit(1);
  }

  const fullPath = path.isAbsolute(backupFile) 
    ? backupFile 
    : path.join(__dirname, '..', '..', backupFile);

  if (!fs.existsSync(fullPath)) {
    console.error(`❌ קובץ הגיבוי לא נמצא: ${fullPath}`);
    process.exit(1);
  }

  console.log('🔄 Rollback - שחזור מגיבוי\n');
  console.log(`📄 קובץ גיבוי: ${fullPath}\n`);

  try {
    // קריאת הגיבוי
    const backup = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    console.log(`📅 תאריך הגיבוי: ${backup.timestamp}`);
    console.log(`📊 נתונים:`);
    console.log(`   - מיגרציות: ${backup.stats.migrations}`);
    console.log(`   - ארגונים: ${backup.stats.organizations}`);
    console.log(`   - משתמשים: ${backup.stats.users}`);
    console.log('');

    // אישור
    const confirmed = await askConfirmation(
      '❓ האם אתה בטוח שברצונך לשחזר את המצב מהגיבוי? זה ימחק את המצב הנוכחי! (yes/no): '
    );

    if (!confirmed) {
      console.log('\n❌ Rollback בוטל\n');
      await prisma.$disconnect();
      process.exit(0);
    }

    console.log('\n🔄 מתחיל שחזור...\n');

    // 1. ניקוי _prisma_migrations
    console.log('🗑️  מנקה _prisma_migrations...');
    await prisma.$executeRaw`DELETE FROM "_prisma_migrations";`;
    console.log('   ✅ נוקה\n');

    // 2. שחזור _prisma_migrations
    console.log('📋 משחזר _prisma_migrations...');
    for (const migration of backup.data.migrations) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "_prisma_migrations" (
          id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8
        );
      `, 
        migration.id,
        migration.checksum,
        migration.finished_at,
        migration.migration_name,
        migration.logs,
        migration.rolled_back_at,
        migration.started_at,
        migration.applied_steps_count
      );
    }
    console.log(`   ✅ ${backup.data.migrations.length} מיגרציות שוחזרו\n`);

    console.log('✅ Rollback הושלם בהצלחה!\n');
    console.log('💡 המצב חזר למה שהיה בזמן הגיבוי\n');

    await prisma.$disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ שגיאה ב-Rollback:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

rollback();
