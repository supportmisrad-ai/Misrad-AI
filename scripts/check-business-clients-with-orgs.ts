/**
 * בדיקה מעמיקה - מי מקושר למי
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBusinessClientsWithOrgs() {
  console.log('🔍 בודק קישורים בין business_clients לארגונים...\n');

  try {
    // 1. כל ה-business_clients
    const allClients = await prisma.businessClient.findMany({
      where: { deleted_at: null },
      include: {
        organizations: {
          where: {
            slug: { in: ['misrad-ai-demo-il', 'misrad-ai-hq-4b96f01c'] }
          },
          select: {
            id: true,
            name: true,
            slug: true,
            client_id: true,
          }
        }
      }
    });

    console.log(`📊 סה"כ Business Clients: ${allClients.length}\n`);

    const clientsWithTargetOrgs = allClients.filter(c => c.organizations.length > 0);
    
    if (clientsWithTargetOrgs.length > 0) {
      console.log(`⚠️  נמצאו ${clientsWithTargetOrgs.length} Business Clients עם הארגונים שלנו:\n`);
      
      clientsWithTargetOrgs.forEach(client => {
        console.log(`\nBusiness Client: ${client.company_name} (${client.id})`);
        console.log(`  Email: ${client.primary_email}`);
        console.log(`  Status: ${client.status}`);
        console.log(`  Organizations:`);
        client.organizations.forEach(org => {
          console.log(`    - ${org.name} (${org.slug})`);
          console.log(`      client_id: ${org.client_id} ${org.client_id === client.id ? '✅ מקושר' : '❌ לא מקושר!'}`);
        });
      });
    } else {
      console.log('✅ אין Business Clients עם הארגונים שלנו\n');
    }

    // 2. בדיקה הפוכה - האם הארגונים מקושרים למישהו?
    console.log('\n\n📊 בדיקת הארגונים עצמם:\n');
    
    const orgs = await prisma.organization.findMany({
      where: {
        slug: { in: ['misrad-ai-demo-il', 'misrad-ai-hq-4b96f01c'] }
      },
      select: {
        id: true,
        name: true,
        slug: true,
        client_id: true,
        owner_id: true,
        business_client: {
          select: {
            id: true,
            company_name: true,
            primary_email: true,
          }
        }
      }
    });

    orgs.forEach(org => {
      console.log(`\nארגון: ${org.name} (${org.slug})`);
      console.log(`  ID: ${org.id}`);
      console.log(`  client_id: ${org.client_id || 'NULL ✅'}`);
      console.log(`  owner_id: ${org.owner_id || 'NULL ❌'}`);
      
      if (org.business_client) {
        console.log(`  ⚠️  Business Client: ${org.business_client.company_name}`);
        console.log(`     ${org.business_client.primary_email}`);
      } else {
        console.log(`  ✅ לא מקושר ל-Business Client`);
      }
    });

    console.log('\n\n📋 סיכום סופי:\n');
    
    const problematicOrgs = orgs.filter(o => o.client_id !== null || o.business_client !== null);
    
    if (problematicOrgs.length > 0) {
      console.log(`❌ יש ${problematicOrgs.length} ארגונים בעייתיים שעדיין מקושרים!`);
      console.log('   צריך לנתק אותם ידנית.\n');
    } else {
      console.log('✅ כל הארגונים נקיים - לא מקושרים ל-business_clients\n');
    }

  } catch (error) {
    console.error('❌ שגיאה:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkBusinessClientsWithOrgs();
