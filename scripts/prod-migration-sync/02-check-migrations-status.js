#!/usr/bin/env node
/**
 * 02-check-migrations-status.js
 * בדיקת מצב המיגרציות הנוכחי ב-Production והשוואה ל-DEV
 * 
 * Usage: npx dotenv -e .env.prod_backup -- node scripts/prod-migration-sync/02-check-migrations-status.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function checkMigrationsStatus() {
  console.log('🔍 בדיקת מצב מיגרציות Production...\n');

  try {
    // 1. בדיקה אם טבלת _prisma_migrations קיימת
    console.log('📋 בדיקת טבלת _prisma_migrations...');
    const tableExists = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_prisma_migrations'
      );
    `);
    
    if (!tableExists[0]?.exists) {
      console.log('   ⚠️  טבלת _prisma_migrations לא קיימת!\n');
      console.log('💡 המלצה: הרץ prisma migrate deploy בפעם הראשונה\n');
      await prisma.$disconnect();
      process.exit(0);
    }
    console.log('   ✅ טבלת _prisma_migrations קיימת\n');

    // 2. קריאת כל המיגרציות שרשומות
    console.log('📊 מיגרציות רשומות ב-Production:');
    const appliedMigrations = await prisma.$queryRaw`
      SELECT 
        migration_name,
        finished_at,
        logs
      FROM "_prisma_migrations"
      ORDER BY finished_at;
    `;

    if (appliedMigrations.length === 0) {
      console.log('   ⚠️  אין מיגרציות רשומות!\n');
    } else {
      appliedMigrations.forEach((m, idx) => {
        const status = m.finished_at ? '✅' : '⏳';
        console.log(`   ${status} ${idx + 1}. ${m.migration_name}`);
      });
      console.log(`\n   סה"כ: ${appliedMigrations.length} מיגרציות\n`);
    }

    // 3. קריאת מיגרציות מתיקיית migrations
    console.log('📁 מיגרציות בתיקיית prisma/migrations:');
    const migrationsDir = path.join(__dirname, '..', '..', 'prisma', 'migrations');
    const migrationFolders = fs.readdirSync(migrationsDir)
      .filter(f => {
        const fullPath = path.join(migrationsDir, f);
        return fs.statSync(fullPath).isDirectory() && f !== 'migration_lock.toml';
      })
      .sort();

    migrationFolders.forEach((folder, idx) => {
      const isApplied = appliedMigrations.some(m => m.migration_name === folder);
      const status = isApplied ? '✅' : '❌';
      console.log(`   ${status} ${idx + 1}. ${folder}`);
    });
    console.log(`\n   סה"כ: ${migrationFolders.length} מיגרציות\n`);

    // 4. השוואה
    console.log('🔄 ניתוח הבדלים:');
    const appliedNames = new Set(appliedMigrations.map(m => m.migration_name));
    const expectedNames = new Set(migrationFolders);

    const missing = migrationFolders.filter(f => !appliedNames.has(f));
    const extra = appliedMigrations.map(m => m.migration_name).filter(m => !expectedNames.has(m));

    if (missing.length > 0) {
      console.log(`\n   ⚠️  מיגרציות חסרות ב-DB (${missing.length}):`);
      missing.forEach(m => console.log(`      - ${m}`));
    }

    if (extra.length > 0) {
      console.log(`\n   ⚠️  מיגרציות עודפות ב-DB (${extra.length}):`);
      extra.forEach(m => console.log(`      - ${m}`));
    }

    if (missing.length === 0 && extra.length === 0) {
      console.log('   ✅ המיגרציות מסונכרנות לחלוטין!\n');
    } else {
      console.log('\n💡 המלצות:');
      if (extra.length > 0) {
        console.log('   1. נקה את טבלת _prisma_migrations (סקריפט 03)');
      }
      if (missing.length > 0) {
        console.log('   2. הרץ Baseline למיגרציות הקיימות (סקריפט 04)');
        console.log('   3. הרץ prisma migrate deploy (סקריפט 05)');
      }
      console.log('');
    }

    // 5. בדיקת טבלאות קריטיות
    console.log('🔍 בדיקת טבלאות קריטיות:');
    const criticalTables = [
      'social_organizations',
      'organization_users',
      'profiles',
      'nexus_onboarding_settings',
      'core_system_settings'
    ];

    for (const table of criticalTables) {
      const exists = await prisma.$queryRawUnsafe(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, table);
      
      const status = exists[0]?.exists ? '✅' : '❌';
      console.log(`   ${status} ${table}`);
    }
    console.log('');

    await prisma.$disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ שגיאה בבדיקת סטטוס:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkMigrationsStatus();
