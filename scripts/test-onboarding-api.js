#!/usr/bin/env node
/**
 * בדיקה ישירה של nexus_onboarding_settings
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testOnboardingAPI() {
  console.log('🔍 בדיקת nexus_onboarding_settings...\n');

  try {
    // בדיקה שהטבלה קיימת
    const tableExists = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'nexus_onboarding_settings';
    `);

    if (tableExists.length === 0) {
      console.log('❌ טבלת nexus_onboarding_settings לא קיימת!\n');
      await prisma.$disconnect();
      process.exit(1);
    }

    console.log('✅ טבלת nexus_onboarding_settings קיימת\n');

    // ספירת רשומות
    const count = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "nexus_onboarding_settings";
    `;
    console.log(`📊 ${count[0]?.count || 0} רשומות onboarding\n`);

    // קריאה של כל הרשומות
    const settings = await prisma.$queryRaw`
      SELECT * FROM "nexus_onboarding_settings";
    `;

    if (settings.length > 0) {
      console.log('📋 רשומות קיימות:');
      settings.forEach(s => {
        console.log(`   - org: ${s.organization_id}, template: ${s.template_key}`);
      });
      console.log('');
    }

    // בדיקת ארגון ראשון
    const firstOrg = await prisma.$queryRaw`
      SELECT id, slug, name FROM "organizations" LIMIT 1;
    `;

    if (firstOrg.length > 0) {
      const org = firstOrg[0];
      console.log(`🏢 בודק ארגון: ${org.name} (${org.slug})\n`);

      // נסיון לקרוא onboarding setting
      const orgSetting = await prisma.$queryRawUnsafe(`
        SELECT * FROM "nexus_onboarding_settings" 
        WHERE organization_id = $1;
      `, org.id);

      if (orgSetting.length > 0) {
        console.log(`   ✅ יש onboarding setting: ${orgSetting[0].template_key}`);
      } else {
        console.log('   ⚠️  אין onboarding setting לארגון זה');
      }
    }

    console.log('\n✅ כל הבדיקות עברו!\n');
    await prisma.$disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ שגיאה:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testOnboardingAPI();
