/**
 * בדיקה - מה הארגונים שבאמת קיימים למשתמש
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRealOrgs() {
  console.log('🔍 בודק ארגונים עבור itsikdahan1@gmail.com...\n');

  try {
    // 1. מציאת המשתמש
    const user = await prisma.organizationUser.findFirst({
      where: {
        OR: [
          { clerk_user_id: 'user_39UkuSmIkk20b1MuAahuYqWHKoe' },
          { email: { contains: 'itsikdahan1', mode: 'insensitive' } }
        ]
      }
    });

    if (!user) {
      console.log('❌ משתמש לא נמצא!');
      return;
    }

    console.log('✅ נמצא משתמש:', user.full_name, '|', user.email);
    console.log('   User ID:', user.id);
    console.log('   Clerk ID:', user.clerk_user_id, '\n');

    // 2. ארגונים שהמשתמש owner שלהם
    const ownedOrgs = await prisma.organization.findMany({
      where: { owner_id: user.id, deleted_at: null },
      select: {
        id: true,
        name: true,
        slug: true,
        client_id: true,
        subscription_status: true,
        created_at: true,
      }
    });

    console.log(`📊 ארגונים שהמשתמש owner שלהם: ${ownedOrgs.length}\n`);
    if (ownedOrgs.length > 0) {
      console.table(ownedOrgs);
    }

    // 3. כל הארגונים (למקרה שהוא לא owner)
    const allOrgs = await prisma.organization.findMany({
      where: { deleted_at: null },
      take: 20,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        owner_id: true,
        client_id: true,
        subscription_status: true,
        created_at: true,
      }
    });

    console.log(`\n📊 כל הארגונים במערכת (20 אחרונים):\n`);
    console.table(allOrgs);

    // 4. בדיקת business_clients
    const businessClients = await prisma.businessClient.findMany({
      where: { deleted_at: null },
      take: 10,
      select: {
        id: true,
        company_name: true,
        primary_email: true,
        status: true,
        created_at: true,
      }
    });

    console.log(`\n📊 לקוחות עסקיים: ${businessClients.length}\n`);
    if (businessClients.length > 0) {
      console.table(businessClients);
    }

    // 5. ארגונים עם client_id (מקושרים ללקוחות עסקיים)
    const linkedOrgs = await prisma.organization.findMany({
      where: { 
        client_id: { not: null },
        deleted_at: null 
      },
      select: {
        id: true,
        name: true,
        slug: true,
        client_id: true,
      }
    });

    console.log(`\n📊 ארגונים מקושרים ללקוחות עסקיים: ${linkedOrgs.length}\n`);
    if (linkedOrgs.length > 0) {
      console.table(linkedOrgs);
    }

  } catch (error) {
    console.error('❌ שגיאה:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkRealOrgs();
