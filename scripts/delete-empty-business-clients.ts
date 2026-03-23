/**
 * מחיקת business_clients ריקים שנוצרו בטעות עבור הארגונים הדמו
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_ORG_NAMES = ['הדגמה - סוכנות דיגיטל פרו', 'Misrad AI HQ'];

async function deleteEmptyBusinessClients() {
  console.log('🗑️  מוחק business_clients ריקים...\n');

  try {
    // 1. מצא business_clients עם השמות של הארגונים הדמו אבל בלי ארגונים מקושרים
    const emptyClients = await prisma.businessClient.findMany({
      where: {
        company_name: { in: DEMO_ORG_NAMES },
        deleted_at: null,
      },
      include: {
        organizations: { select: { id: true, name: true } },
        contacts: { select: { id: true } },
      }
    });

    console.log(`📊 נמצאו ${emptyClients.length} business_clients עם שמות דמו:\n`);

    const clientsToDelete = emptyClients.filter(c => c.organizations.length === 0);
    const clientsWithOrgs = emptyClients.filter(c => c.organizations.length > 0);

    if (clientsWithOrgs.length > 0) {
      console.log(`✅ ${clientsWithOrgs.length} business_clients עם ארגונים (לא למחוק):`);
      clientsWithOrgs.forEach(c => {
        console.log(`  - ${c.company_name} (${c.id}): ${c.organizations.length} ארגונים, ${c.contacts.length} אנשי קשר`);
      });
      console.log('');
    }

    if (clientsToDelete.length === 0) {
      console.log('✅ אין business_clients ריקים למחוק\n');
      return;
    }

    console.log(`🗑️  ${clientsToDelete.length} business_clients ריקים למחיקה:\n`);
    clientsToDelete.forEach(c => {
      console.log(`  - ${c.company_name} (${c.id}): ${c.contacts.length} אנשי קשר`);
    });

    console.log('\n');

    // 2. מחק אותם (soft delete)
    for (const client of clientsToDelete) {
      await prisma.businessClient.update({
        where: { id: client.id },
        data: { deleted_at: new Date() }
      });
      console.log(`  ✅ נמחק: ${client.company_name}`);
    }

    console.log('\n✅ מחיקה הושלמה!');

    // 3. וידוא - בדוק שכל הארגונים עדיין מקושרים נכון
    console.log('\n📊 וידוא: בודק שהארגונים הדמו עדיין מקושרים...\n');

    const demoOrgs = await prisma.organization.findMany({
      where: {
        name: { in: DEMO_ORG_NAMES },
        deleted_at: null,
      },
      select: {
        name: true,
        slug: true,
        client_id: true,
        business_client: {
          select: {
            id: true,
            company_name: true,
            primary_email: true,
          }
        }
      }
    });

    console.log(`נמצאו ${demoOrgs.length} ארגונים דמו:\n`);
    demoOrgs.forEach(org => {
      if (org.business_client) {
        console.log(`  ✅ ${org.name}`);
        console.log(`     מקושר ל: ${org.business_client.company_name} (${org.business_client.primary_email})`);
      } else {
        console.log(`  ❌ ${org.name} - לא מקושר!`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ שגיאה:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteEmptyBusinessClients();
