#!/usr/bin/env node
/**
 * 06-verify-sync.js
 * אימות שהסנכרון בין Production ל-DEV הושלם בהצלחה
 * 
 * Usage: npx dotenv -e .env.prod_backup -- node scripts/prod-migration-sync/06-verify-sync.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function verifySync() {
  console.log('✅ אימות סנכרון Production\n');

  try {
    let allGood = true;

    // 1. בדיקת מיגרציות
    console.log('📋 בדיקת מיגרציות...');
    const migrationsDir = path.join(__dirname, '..', '..', 'prisma', 'migrations');
    const expectedMigrations = fs.readdirSync(migrationsDir)
      .filter(f => {
        const fullPath = path.join(migrationsDir, f);
        return fs.statSync(fullPath).isDirectory() && f !== 'migration_lock.toml';
      })
      .sort();

    const appliedMigrations = await prisma.$queryRaw`
      SELECT migration_name FROM "_prisma_migrations" 
      WHERE finished_at IS NOT NULL
      ORDER BY finished_at;
    `;

    const appliedNames = new Set(appliedMigrations.map(m => m.migration_name));
    const missing = expectedMigrations.filter(m => !appliedNames.has(m));

    if (missing.length === 0) {
      console.log(`   ✅ כל ${expectedMigrations.length} המיגרציות מיושמות\n`);
    } else {
      console.log(`   ❌ חסרות ${missing.length} מיגרציות:`);
      missing.forEach(m => console.log(`      - ${m}`));
      console.log('');
      allGood = false;
    }

    // 2. בדיקת טבלאות קריטיות
    console.log('🔍 בדיקת טבלאות קריטיות...');
    const criticalTables = [
      'social_organizations',
      'organization_users',
      'profiles',
      'nexus_onboarding_settings',
      'core_system_settings',
      'nexus_tasks',
      'nexus_time_entries',
    ];

    for (const table of criticalTables) {
      const exists = await prisma.$queryRawUnsafe(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, table);
      
      if (exists[0]?.exists) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} - חסר!`);
        allGood = false;
      }
    }
    console.log('');

    // 3. בדיקת עמודות חדשות (שבת, SaaS)
    console.log('🆕 בדיקת עמודות חדשות...');
    
    // בדיקת עמודת is_shabbat_protected
    const shabbatColumn = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'social_organizations' 
      AND column_name = 'is_shabbat_protected';
    `);
    
    if (shabbatColumn.length > 0) {
      console.log('   ✅ is_shabbat_protected (הגנת שבת)');
    } else {
      console.log('   ❌ is_shabbat_protected - חסר!');
      allGood = false;
    }

    // בדיקת עמודות SaaS
    const saasColumns = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'social_organizations' 
      AND column_name IN ('subscription_plan', 'subscription_status', 'subscription_seats');
    `);
    
    if (saasColumns.length >= 3) {
      console.log('   ✅ עמודות SaaS (subscription_*)');
    } else {
      console.log(`   ⚠️  נמצאו רק ${saasColumns.length}/3 עמודות SaaS`);
      allGood = false;
    }
    console.log('');

    // 4. בדיקת נתונים
    console.log('📊 בדיקת נתונים...');
    const orgCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "social_organizations";
    `;
    const userCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "organization_users";
    `;
    
    console.log(`   🏢 ארגונים: ${orgCount[0]?.count || 0}`);
    console.log(`   👥 משתמשים: ${userCount[0]?.count || 0}`);
    console.log('');

    // 5. בדיקת ארגונים עם חבילת the_mentor
    console.log('🎯 בדיקת חבילות SaaS...');
    const orgsWithPlan = await prisma.$queryRaw`
      SELECT 
        COUNT(*) FILTER (WHERE subscription_plan = 'the_mentor') as mentor_count,
        COUNT(*) FILTER (WHERE subscription_plan IS NULL) as null_count,
        COUNT(*) as total
      FROM "social_organizations";
    `;
    
    const stats = orgsWithPlan[0];
    console.log(`   ✅ חבילת the_mentor: ${stats?.mentor_count || 0} ארגונים`);
    if (stats?.null_count > 0) {
      console.log(`   ⚠️  ללא חבילה: ${stats.null_count} ארגונים`);
    }
    console.log('');

    // 6. סיכום
    if (allGood) {
      console.log('🎉 כל הבדיקות עברו בהצלחה!\n');
      console.log('✅ Production מסונכרן לחלוטין עם DEV\n');
      process.exit(0);
    } else {
      console.log('⚠️  יש בעיות שצריך לטפל בהן\n');
      console.log('💡 המלצה: בדוק את הלוגים והרץ שוב את השלבים הרלוונטיים\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ שגיאה באימות:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

verifySync();
