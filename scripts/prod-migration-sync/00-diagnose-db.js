#!/usr/bin/env node
/**
 * 00-diagnose-db.js
 * אבחון מלא של מצב ה-DB
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
  console.log('🔍 אבחון Production DB...\n');

  try {
    // 1. בדיקת חיבור
    console.log('📡 בדיקת חיבור...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('   ✅ חיבור תקין\n');

    // 2. רשימת כל הטבלאות
    console.log('📋 טבלאות קיימות ב-DB:');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    if (tables.length === 0) {
      console.log('   ❌ אין טבלאות בכלל!\n');
    } else {
      tables.forEach((t, idx) => {
        console.log(`   ${idx + 1}. ${t.table_name}`);
      });
      console.log(`\n   סה"כ: ${tables.length} טבלאות\n`);
    }

    // 3. בדיקת _prisma_migrations
    const migrationsExists = tables.some(t => t.table_name === '_prisma_migrations');
    if (migrationsExists) {
      console.log('📋 מיגרציות ב-_prisma_migrations:');
      const migrations = await prisma.$queryRaw`
        SELECT migration_name, finished_at 
        FROM "_prisma_migrations"
        ORDER BY finished_at;
      `;
      console.log(`   סה"כ: ${migrations.length} מיגרציות\n`);
      if (migrations.length > 0 && migrations.length <= 5) {
        migrations.forEach(m => console.log(`   - ${m.migration_name}`));
        console.log('');
      }
    }

    await prisma.$disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ שגיאה:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

diagnose();
