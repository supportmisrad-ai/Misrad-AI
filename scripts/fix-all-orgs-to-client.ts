/**
 * תיקון: קישור כל 9 הארגונים ל-business_client של itsikdahan1@gmail.com
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SUPER_ADMIN_EMAIL = 'itsikdahan1@gmail.com';
const SUPER_ADMIN_CLERK_ID = 'user_39UkuSmIkk20b1MuAahuYqWHKoe';

async function fixAllOrgsToClient() {
  console.log('🔧 מקשר את כל 9 הארגונים ל-business_client של', SUPER_ADMIN_EMAIL, '\n');

  try {
    // 1. מצא את ה-business_client של itsikdahan1@gmail.com
    let client = await prisma.businessClient.findUnique({
      where: { primary_email: SUPER_ADMIN_EMAIL },
      select: { id: true, company_name: true, primary_email: true }
    });

    if (!client) {
      console.log('⚠️  Business Client לא נמצא - יוצר חדש...');
      client = await prisma.businessClient.create({
        data: {
          company_name: 'יצחק דהן',
          primary_email: SUPER_ADMIN_EMAIL,
          status: 'active',
          lifecycle_stage: 'customer',
        },
        select: { id: true, company_name: true, primary_email: true }
      });
      console.log(`✅ נוצר Business Client: ${client.company_name} (${client.id})\n`);
    } else {
      console.log(`✅ Business Client נמצא: ${client.company_name} (${client.id})\n`);
    }

    // 2. מצא את כל הארגונים של היוזר
    const userOrgs = await prisma.organization.findMany({
      where: {
        owner: {
          clerk_user_id: SUPER_ADMIN_CLERK_ID
        },
        deleted_at: null
      },
      select: {
        id: true,
        name: true,
        slug: true,
        client_id: true,
      },
      orderBy: { created_at: 'asc' }
    });

    console.log(`📊 נמצאו ${userOrgs.length} ארגונים:\n`);

    // 3. קשר את כולם
    let linked = 0;
    let alreadyLinked = 0;

    for (const org of userOrgs) {
      if (org.client_id === client.id) {
        console.log(`  ✅ ${org.name} (${org.slug}) - כבר מקושר`);
        alreadyLinked++;
      } else {
        await prisma.organization.update({
          where: { id: org.id },
          data: { 
            client_id: client.id,
            updated_at: new Date()
          }
        });
        console.log(`  🔗 ${org.name} (${org.slug}) - קושר!`);
        linked++;
      }
    }

    // 4. וידוא
    console.log(`\n📋 סיכום:`);
    console.log(`  קושרו מחדש: ${linked}`);
    console.log(`  כבר היו מקושרים: ${alreadyLinked}`);
    console.log(`  סה"כ: ${userOrgs.length}\n`);

    // 5. אימות סופי
    const verifyOrgs = await prisma.organization.findMany({
      where: {
        owner: { clerk_user_id: SUPER_ADMIN_CLERK_ID },
        deleted_at: null
      },
      select: {
        name: true,
        client_id: true,
      }
    });

    const allLinked = verifyOrgs.every(o => o.client_id === client.id);
    
    if (allLinked) {
      console.log(`✅ כל ${verifyOrgs.length} הארגונים מקושרים ל-${client.company_name}!`);
    } else {
      const missing = verifyOrgs.filter(o => o.client_id !== client.id);
      console.log(`❌ ${missing.length} ארגונים לא מקושרים:`);
      missing.forEach(o => console.log(`  - ${o.name}: client_id = ${o.client_id}`));
    }

    // 6. בדיקה שלקוחות אחרים לא נפגעו
    console.log('\n\n📊 בדיקת שלמות לקוחות אחרים:\n');
    
    const otherClients = await prisma.businessClient.findMany({
      where: { 
        deleted_at: null,
        id: { not: client.id }
      },
      include: {
        organizations: {
          select: { id: true, name: true }
        }
      }
    });

    const clientsWithOrgs = otherClients.filter(c => c.organizations.length > 0);
    console.log(`לקוחות אחרים עם ארגונים: ${clientsWithOrgs.length}`);
    clientsWithOrgs.forEach(c => {
      console.log(`  ${c.company_name}: ${c.organizations.length} ארגונים`);
    });

    const clientsWithoutOrgs = otherClients.filter(c => c.organizations.length === 0);
    console.log(`לקוחות ללא ארגונים: ${clientsWithoutOrgs.length}\n`);

    console.log('✅ הושלם!');

  } catch (error) {
    console.error('❌ שגיאה:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixAllOrgsToClient();
