/**
 * בדיקת סטטוס מדויק של הארגונים ב-DB
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyOrgStatus() {
  console.log('🔍 בודק סטטוס מדויק של הארגונים...\n');

  try {
    // בדיקת הארגונים
    const orgs = await prisma.organization.findMany({
      where: {
        slug: { in: ['misrad-ai-demo-il', 'misrad-ai-hq-4b96f01c'] }
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            full_name: true,
            clerk_user_id: true,
          }
        },
        business_client: {
          select: {
            id: true,
            company_name: true,
            status: true,
          }
        }
      }
    });

    console.log('📊 סטטוס ארגונים:\n');
    
    for (const org of orgs) {
      console.log(`\n--- ${org.name} (${org.slug}) ---`);
      console.log(`ID: ${org.id}`);
      console.log(`client_id: ${org.client_id || 'NULL ✅'}`);
      console.log(`owner_id: ${org.owner_id || 'NULL ❌'}`);
      
      if (org.owner) {
        console.log(`\nOwner Details:`);
        console.log(`  Email: ${org.owner.email}`);
        console.log(`  Name: ${org.owner.full_name}`);
        console.log(`  Clerk ID: ${org.owner.clerk_user_id}`);
      } else {
        console.log(`\n❌ אין owner!`);
      }
      
      if (org.business_client) {
        console.log(`\n⚠️  מקושר ל-Business Client:`);
        console.log(`  ID: ${org.business_client.id}`);
        console.log(`  Name: ${org.business_client.company_name}`);
        console.log(`  Status: ${org.business_client.status}`);
      } else {
        console.log(`\n✅ לא מקושר ל-Business Client`);
      }
      
      console.log('\n---');
    }

    // בדיקת business_clients שמקושרים לארגונים
    console.log('\n\n📊 Business Clients המקושרים לארגונים אלה:\n');
    
    const linkedClients = await prisma.businessClient.findMany({
      where: {
        organizations: {
          some: {
            slug: { in: ['misrad-ai-demo-il', 'misrad-ai-hq-4b96f01c'] }
          }
        }
      },
      include: {
        organizations: {
          select: {
            slug: true,
            name: true,
          }
        }
      }
    });

    if (linkedClients.length > 0) {
      console.log(`נמצאו ${linkedClients.length} Business Clients מקושרים:\n`);
      linkedClients.forEach(client => {
        console.log(`- ${client.company_name} (${client.id})`);
        console.log(`  Orgs: ${client.organizations.map(o => o.slug).join(', ')}`);
      });
    } else {
      console.log('✅ אין Business Clients מקושרים');
    }

    // סיכום
    console.log('\n\n📋 סיכום:\n');
    const hasClientId = orgs.some(o => o.client_id !== null);
    const hasOwner = orgs.every(o => o.owner_id !== null && o.owner !== null);
    const hasCorrectClerkId = orgs.every(o => o.owner?.clerk_user_id === 'user_39UkuSmIkk20b1MuAahuYqWHKoe');
    
    console.log(`client_id = NULL: ${!hasClientId ? '✅ כן' : '❌ לא'}`);
    console.log(`owner_id מוגדר: ${hasOwner ? '✅ כן' : '❌ לא'}`);
    console.log(`Clerk ID נכון: ${hasCorrectClerkId ? '✅ כן' : '❌ לא'}`);
    
    if (!hasClientId && hasOwner && hasCorrectClerkId) {
      console.log('\n✅ הכל תקין!');
    } else {
      console.log('\n❌ יש בעיות שצריך לתקן');
    }

  } catch (error) {
    console.error('❌ שגיאה:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyOrgStatus();
