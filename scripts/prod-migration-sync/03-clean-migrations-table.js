#!/usr/bin/env node
/**
 * 03-clean-migrations-table.js
 * ניקוי טבלת _prisma_migrations מהיסטוריה מלוכלכת
 * ⚠️ DESTRUCTIVE - הרץ רק לאחר גיבוי!
 * 
 * Usage: npx dotenv -e .env.prod_backup -- node scripts/prod-migration-sync/03-clean-migrations-table.js
 */

const { PrismaClient } = require('@prisma/client');
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

async function cleanMigrationsTable() {
  console.log('🗑️  ניקוי טבלת _prisma_migrations\n');
  console.log('⚠️  אזהרה: פעולה זו תמחק את כל ההיסטוריה של המיגרציות!\n');

  try {
    // 1. בדיקה שיש גיבוי
    console.log('📋 בדיקת מיגרציות קיימות...');
    const migrations = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "_prisma_migrations";
    `;
    const count = Number(migrations[0]?.count || 0);
    console.log(`   נמצאו ${count} מיגרציות רשומות\n`);

    if (count === 0) {
      console.log('✅ הטבלה כבר ריקה - אין צורך בניקוי\n');
      await prisma.$disconnect();
      process.exit(0);
    }

    // 2. אישור מהמשתמש
    const confirmed = await askConfirmation(
      `❓ האם אתה בטוח שברצונך למחוק ${count} מיגרציות? (yes/no): `
    );

    if (!confirmed) {
      console.log('\n❌ הפעולה בוטלה על ידי המשתמש\n');
      await prisma.$disconnect();
      process.exit(0);
    }

    // 3. מחיקת כל הרשומות
    console.log('\n🗑️  מוחק את כל הרשומות...');
    await prisma.$executeRaw`
      DELETE FROM "_prisma_migrations";
    `;

    // 4. אימות
    const afterClean = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "_prisma_migrations";
    `;
    const afterCount = Number(afterClean[0]?.count || 0);

    if (afterCount === 0) {
      console.log('   ✅ הטבלה נוקתה בהצלחה!\n');
      console.log('💡 צעד הבא: הרץ Baseline (סקריפט 04) או prisma migrate deploy\n');
    } else {
      console.log(`   ⚠️  נותרו ${afterCount} רשומות - ייתכן שהייתה בעיה\n`);
    }

    await prisma.$disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ שגיאה בניקוי:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

cleanMigrationsTable();
