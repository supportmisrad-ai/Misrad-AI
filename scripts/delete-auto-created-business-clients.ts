/**
 * מחיקת business_clients שנוצרו אוטומטית ע"י backfillUnlinkedOrganizations
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAutoCreatedBusinessClients() {
  console.log('🗑️  מוחק business_clients שנוצרו אוטומטית...\n');

  try {
    // מחיקת business_clients עבור הארגונים שלנו
    const targetOrgs = await prisma.organization.findMany({
      where: {
        slug: { in: ['misrad-ai-demo-il', 'misrad-ai-hq-4b96f01c'] },
        client_id: { not: null }
      },
      select: {
        id: true,
        name: true,
        slug: true,
        client_id: true,
      }
    });

    console.log(`נמצאו ${targetOrgs.length} ארגונים עם client_id:\n`);
    
    if (targetOrgs.length === 0) {
      console.log('✅ אין ארגונים מקושרים ל-business_clients\n');
      return;
    }

    targetOrgs.forEach(org => {
      console.log(`- ${org.name} (${org.slug}) → client_id: ${org.client_id}`);
    });

    console.log('\n');

    // ניתוק הארגונים
    const updated = await prisma.organization.updateMany({
      where: {
        slug: { in: ['misrad-ai-demo-il', 'misrad-ai-hq-4b96f01c'] }
      },
      data: {
        client_id: null,
        updated_at: new Date()
      }
    });

    console.log(`✅ נותקו ${updated.count} ארגונים מ-business_clients\n`);

    // מחיקת business_clients ריקים (ללא ארגונים אחרים)
    const emptyClients = await prisma.businessClient.findMany({
      where: {
        organizations: { none: {} }
      },
      select: {
        id: true,
        company_name: true,
      }
    });

    if (emptyClients.length > 0) {
      console.log(`\nנמצאו ${emptyClients.length} business_clients ריקים (ללא ארגונים):\n`);
      emptyClients.forEach(c => console.log(`- ${c.company_name} (${c.id})`));

      // לא מוחק אוטומטית - רק מדווח
      console.log('\n⚠️  לא נמחקו אוטומטית - אם רוצה למחוק, הוסף לוגיקה כאן\n');
    }

    console.log('\n✅ הושלם!');

  } catch (error) {
    console.error('❌ שגיאה:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteAutoCreatedBusinessClients();
