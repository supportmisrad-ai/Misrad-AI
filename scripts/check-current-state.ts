/**
 * בדיקת מצב נוכחי - מה קורה ב-DB עכשיו
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCurrentState() {
  console.log('🔍 בודק מצב נוכחי של DB...\n');

  try {
    // 1. כל הארגונים של היוזר
    const userOrgs = await prisma.organization.findMany({
      where: {
        owner: {
          clerk_user_id: 'user_39UkuSmIkk20b1MuAahuYqWHKoe'
        },
        deleted_at: null
      },
      select: {
        id: true,
        name: true,
        slug: true,
        client_id: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' }
    });

    console.log(`📊 ארגונים של היוזר (Clerk ID: user_39UkuSmIkk20b1MuAahuYqWHKoe):\n`);
    console.log(`סה"כ: ${userOrgs.length} ארגונים\n`);

    userOrgs.forEach((org, idx) => {
      console.log(`${idx + 1}. ${org.name}`);
      console.log(`   Slug: ${org.slug}`);
      console.log(`   client_id: ${org.client_id || 'NULL ✅'}`);
      console.log(`   Created: ${org.created_at.toLocaleString('he-IL')}\n`);
    });

    // 2. כל ה-business_clients
    const allClients = await prisma.businessClient.findMany({
      where: { deleted_at: null },
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    console.log(`\n📊 Business Clients:\n`);
    console.log(`סה"כ: ${allClients.length} business_clients\n`);

    const clientsWithUserOrgs = allClients.filter(c => 
      c.organizations.some(o => userOrgs.some(uo => uo.id === o.id))
    );

    if (clientsWithUserOrgs.length > 0) {
      console.log(`⚠️  ${clientsWithUserOrgs.length} Business Clients עם הארגונים של היוזר:\n`);
      clientsWithUserOrgs.forEach((client, idx) => {
        console.log(`${idx + 1}. ${client.company_name}`);
        console.log(`   Email: ${client.primary_email}`);
        console.log(`   Organizations:`);
        client.organizations.forEach(o => {
          console.log(`     - ${o.name} (${o.slug})`);
        });
        console.log('');
      });
    } else {
      console.log('✅ אין Business Clients עם הארגונים של היוזר\n');
    }

    // 3. ארגונים עם client_id
    const orgsWithClientId = userOrgs.filter(o => o.client_id !== null);
    
    if (orgsWithClientId.length > 0) {
      console.log(`\n❌ ${orgsWithClientId.length} ארגונים עדיין עם client_id:\n`);
      orgsWithClientId.forEach(o => {
        console.log(`- ${o.name}: client_id = ${o.client_id}`);
      });
    } else {
      console.log('\n✅ כל הארגונים עם client_id = NULL\n');
    }

    // 4. סיכום
    console.log('\n📋 סיכום:\n');
    console.log(`ארגונים סה"כ: ${userOrgs.length}`);
    console.log(`Business Clients סה"כ: ${allClients.length}`);
    console.log(`ארגונים מקושרים ל-business_clients: ${orgsWithClientId.length}`);
    console.log(`Business clients עם ארגוני המשתמש: ${clientsWithUserOrgs.length}\n`);

  } catch (error) {
    console.error('❌ שגיאה:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkCurrentState();
