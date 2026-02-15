#!/usr/bin/env node
/**
 * בדיקת הבדלי שמות טבלאות בין מה שאנחנו מצפים למה שקיים
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchemaDiff() {
  console.log('🔍 בדיקת הבדלי סכימה...\n');

  try {
    // טבלאות קריטיות שאנחנו מצפים להן
    const expectedTables = [
      'social_organizations',
      'organization_users',
      'profiles',
      'nexus_onboarding_settings',
      'core_system_settings',
      'nexus_tasks',
      'nexus_clients'
    ];

    console.log('🔍 בדיקת טבלאות קריטיות:\n');

    for (const table of expectedTables) {
      const exists = await prisma.$queryRawUnsafe(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1;
      `, table);

      if (exists.length > 0) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} - לא קיים`);
        
        // נסה לחפש וריאציות
        const similar = await prisma.$queryRawUnsafe(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name LIKE $1;
        `, `%${table.split('_').pop()}%`);

        if (similar.length > 0) {
          console.log(`      💡 אולי התכוונת ל: ${similar.map(t => t.table_name).join(', ')}`);
        }
      }
    }

    console.log('\n📊 בדיקת טבלת organizations:');
    const orgsCheck = await prisma.$queryRaw`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_name = t.table_name AND column_name = 'subscription_plan') as has_subscription,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_name = t.table_name AND column_name = 'is_shabbat_protected') as has_shabbat
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND (table_name = 'organizations' OR table_name = 'social_organizations');
    `;

    orgsCheck.forEach(t => {
      console.log(`\n   📋 ${t.table_name}:`);
      console.log(`      subscription_plan: ${t.has_subscription > 0 ? '✅' : '❌'}`);
      console.log(`      is_shabbat_protected: ${t.has_shabbat > 0 ? '✅' : '❌'}`);
    });

    // ספירת רשומות
    try {
      const orgCount = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "organizations";
      `;
      console.log(`\n   📊 ${orgCount[0]?.count || 0} ארגונים ב-organizations`);
    } catch (e) {
      console.log('\n   ⚠️  לא ניתן לספור רשומות');
    }

    await prisma.$disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ שגיאה:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkSchemaDiff();
