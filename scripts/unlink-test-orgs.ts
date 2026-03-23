/**
 * ניתוק ארגוני TEST מ-business_client
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_CLIENT_ID = '31e94b9b-069f-41b8-a258-bfb64e46e9e3';

async function unlinkTestOrgs() {
  console.log('🔓 מנתק ארגוני TEST מ-business_client...\n');

  try {
    // 1. בדיקה מה מקושר
    const linkedOrgs = await prisma.organization.findMany({
      where: { client_id: TARGET_CLIENT_ID },
      select: {
        id: true,
        name: true,
        slug: true,
        client_id: true,
      }
    });

    console.log(`נמצאו ${linkedOrgs.length} ארגונים מקושרים:\n`);
    linkedOrgs.forEach((org, idx) => {
      console.log(`${idx + 1}. ${org.name} (${org.slug})`);
    });

    console.log('\n');

    // 2. ניתוק
    const result = await prisma.organization.updateMany({
      where: { client_id: TARGET_CLIENT_ID },
      data: {
        client_id: null,
        updated_at: new Date()
      }
    });

    console.log(`✅ נותקו ${result.count} ארגונים מ-business_client\n`);

    // 3. וידוא
    const stillLinked = await prisma.organization.findMany({
      where: { client_id: TARGET_CLIENT_ID },
      select: { id: true, name: true }
    });

    if (stillLinked.length > 0) {
      console.log(`❌ עדיין יש ${stillLinked.length} ארגונים מקושרים!`);
      stillLinked.forEach(o => console.log(`  - ${o.name}`));
    } else {
      console.log('✅ כל הארגונים נותקו בהצלחה!\n');
    }

  } catch (error) {
    console.error('❌ שגיאה:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

unlinkTestOrgs();
