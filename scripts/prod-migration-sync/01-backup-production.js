#!/usr/bin/env node
/**
 * 01-backup-production.js
 * גיבוי מלא של Production DB לפני ביצוע שינויים במיגרציות
 * 
 * Usage: npx dotenv -e .env.prod_backup -- node scripts/prod-migration-sync/01-backup-production.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function backupProduction() {
  console.log('🔄 מתחיל גיבוי Production...\n');

  try {
    // יצירת תיקיית גיבויים
    const backupDir = path.join(__dirname, '..', '..', 'backups', 'prod-migration-sync');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

    console.log(`📁 תיקיית גיבוי: ${backupDir}`);
    console.log(`📄 קובץ גיבוי: ${backupFile}\n`);

    // 1. גיבוי טבלת _prisma_migrations
    console.log('📋 גיבוי _prisma_migrations...');
    const migrations = await prisma.$queryRaw`
      SELECT * FROM "_prisma_migrations" ORDER BY finished_at;
    `;
    console.log(`   ✅ ${migrations.length} מיגרציות נמצאו\n`);

    // 2. גיבוי organizations
    console.log('🏢 גיבוי organizations...');
    const organizations = await prisma.$queryRaw`
      SELECT * FROM "social_organizations" ORDER BY created_at;
    `;
    console.log(`   ✅ ${organizations.length} ארגונים נמצאו\n`);

    // 3. גיבוי organization_users
    console.log('👥 גיבוי organization_users...');
    const users = await prisma.$queryRaw`
      SELECT * FROM "organization_users" ORDER BY created_at;
    `;
    console.log(`   ✅ ${users.length} משתמשים נמצאו\n`);

    // 4. גיבוי טבלאות קריטיות נוספות
    console.log('📊 גיבוי טבלאות נוספות...');
    const profiles = await prisma.$queryRaw`
      SELECT * FROM "profiles" ORDER BY created_at;
    `;
    console.log(`   ✅ ${profiles.length} פרופילים נמצאו\n`);

    // שמירת הגיבוי
    const backup = {
      timestamp: new Date().toISOString(),
      database_url: process.env.DATABASE_URL ? '[REDACTED]' : 'NOT_SET',
      stats: {
        migrations: migrations.length,
        organizations: organizations.length,
        users: users.length,
        profiles: profiles.length,
      },
      data: {
        migrations,
        organizations,
        users,
        profiles,
      }
    };

    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

    console.log('✅ גיבוי הושלם בהצלחה!\n');
    console.log('📊 סטטיסטיקות:');
    console.log(`   - מיגרציות: ${backup.stats.migrations}`);
    console.log(`   - ארגונים: ${backup.stats.organizations}`);
    console.log(`   - משתמשים: ${backup.stats.users}`);
    console.log(`   - פרופילים: ${backup.stats.profiles}`);
    console.log(`\n💾 קובץ גיבוי: ${backupFile}`);

    await prisma.$disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ שגיאה בגיבוי:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

backupProduction();
