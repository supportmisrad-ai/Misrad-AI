#!/usr/bin/env node
/**
 * מציג את כל ה-workspaces שיש למשתמש הנוכחי גישה אליהם
 * 
 * הרצה: node scripts/show-my-workspaces.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showMyWorkspaces() {
  try {
    // קבל את ה-clerk_user_id מ-environment או הדפס הוראות
    const clerkUserId = process.env.CLERK_USER_ID || process.argv[2];
    
    if (!clerkUserId) {
      console.log('\n❌ חסר Clerk User ID');
      console.log('\nאפשרות 1: הרץ עם ה-ID כפרמטר:');
      console.log('  node scripts/show-my-workspaces.js user_2xxxxx\n');
      console.log('אפשרות 2: הגדר משתנה סביבה:');
      console.log('  $env:CLERK_USER_ID="user_2xxxxx"; node scripts/show-my-workspaces.js\n');
      console.log('💡 איך למצוא את ה-Clerk User ID שלך?');
      console.log('  1. היכנס למערכת בדפדפן');
      console.log('  2. פתח DevTools (F12) → Console');
      console.log('  3. הרץ: await fetch("/api/user/me").then(r => r.json())');
      console.log('  4. חפש את clerk_user_id בתוצאות\n');
      process.exit(1);
    }

    console.log('\n🔍 מחפש workspaces עבור:', clerkUserId);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // מצא את המשתמש
    const socialUser = await prisma.OrganizationUser.findUnique({
      where: { clerk_user_id: clerkUserId },
      select: { 
        id: true, 
        organization_id: true,
        last_location_org: true,
        last_module: true,
      },
    });

    if (!socialUser) {
      console.log('❌ לא נמצא משתמש עם clerk_user_id:', clerkUserId);
      console.log('\n💡 ודא שהתחברת למערכת לפחות פעם אחת\n');
      process.exit(1);
    }

    console.log('✅ משתמש נמצא:', socialUser.id);
    console.log('   Primary Org:', socialUser.organization_id || 'אין');
    console.log('   Last Location:', socialUser.last_location_org || 'אין');
    console.log('   Last Module:', socialUser.last_module || 'אין');
    console.log('');

    // מצא את כל הארגונים
    const orgIds = new Set();

    // ארגון ראשי
    if (socialUser.organization_id) {
      orgIds.add(socialUser.organization_id);
    }

    // ארגונים בבעלות
    const ownedOrgs = await prisma.social_organizations.findMany({
      where: { owner_id: socialUser.id },
      select: { id: true },
    });
    for (const org of ownedOrgs) {
      if (org?.id) orgIds.add(org.id);
    }

    // חברות צוות
    const memberships = await prisma.team_members.findMany({
      where: { user_id: socialUser.id },
      select: { organization_id: true },
    });
    for (const m of memberships) {
      if (m.organization_id) orgIds.add(m.organization_id);
    }

    const ids = Array.from(orgIds);
    console.log('📊 נמצאו', ids.length, 'workspaces\n');

    if (ids.length === 0) {
      console.log('⚠️  אין לך גישה לאף workspace');
      console.log('   זה יכול לקרות אם:');
      console.log('   1. משתמש חדש שעוד לא יצר workspace');
      console.log('   2. הרשומה ב-social_users לא מקושרת לארגון\n');
      process.exit(0);
    }

    // טען את הארגונים
    const orgs = await prisma.social_organizations.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        slug: true,
        name: true,
        created_at: true,
        has_nexus: true,
        has_system: true,
        has_social: true,
        has_finance: true,
        has_client: true,
        has_operations: true,
      },
      orderBy: { created_at: 'desc' },
    });

    // מיין: primary ראשון, אחר כך last_location, אחר כך לפי תאריך
    const sortedOrgs = [...orgs].sort((a, b) => {
      if (a.id === socialUser.organization_id) return -1;
      if (b.id === socialUser.organization_id) return 1;
      if (a.slug === socialUser.last_location_org || a.id === socialUser.last_location_org) return -1;
      if (b.slug === socialUser.last_location_org || b.id === socialUser.last_location_org) return 1;
      return 0;
    });

    // הצג
    sortedOrgs.forEach((org, idx) => {
      const isPrimary = org.id === socialUser.organization_id;
      const isLastVisited = org.slug === socialUser.last_location_org || org.id === socialUser.last_location_org;
      
      const badges = [];
      if (isPrimary) badges.push('✅ PRIMARY');
      if (isLastVisited) badges.push('🔵 LAST VISITED');
      
      const modules = [];
      if (org.has_nexus) modules.push('nexus');
      if (org.has_system) modules.push('system');
      if (org.has_social) modules.push('social');
      if (org.has_finance) modules.push('finance');
      if (org.has_client) modules.push('client');
      if (org.has_operations) modules.push('operations');

      console.log(`${idx + 1}. ${org.name}`);
      console.log(`   Slug: ${org.slug}`);
      console.log(`   ID: ${org.id}`);
      if (badges.length > 0) {
        console.log(`   Badges: ${badges.join(' ')}`);
      }
      console.log(`   Modules: ${modules.join(', ') || 'אין'}`);
      console.log(`   Created: ${org.created_at.toISOString().split('T')[0]}`);
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 מה קורה בלוגין?');
    console.log('');
    console.log('   עדיפות 1: נכנס ל-workspace עם 🔵 LAST VISITED');
    console.log('   עדיפות 2: נכנס ל-workspace עם ✅ PRIMARY');
    console.log('   עדיפות 3: נכנס ל-workspace הראשון ברשימה');
    console.log('');

    const selectedOrg = sortedOrgs[0];
    console.log(`   👉 הלוגין יכניס אותך ל: ${selectedOrg.name} (${selectedOrg.slug})`);
    console.log('');

  } catch (error) {
    console.error('\n❌ שגיאה:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

showMyWorkspaces();
