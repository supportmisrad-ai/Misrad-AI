import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';

async function main() {
  console.log('🚀 Seeding Operations, Social, and System data for Demo Organization...');

  const org = await prisma.organization.findUnique({ where: { id: ORG_ID } });
  if (!org) {
    console.error('❌ Organization not found');
    return;
  }

  // --- SYSTEM: Partners, Teams, Goals ---
  console.log('📦 Seeding System module...');
  
  // 1. Partners
  await prisma.partner.createMany({
    data: [
      {
        name: 'Wix Israel',
        email: 'partners@wix.com',
        phone: '03-5555555',
        referralCode: 'wix-il-demo'
      },
      {
        name: 'Fiverr Partners',
        email: 'affiliates@fiverr.com',
        phone: '03-6666666',
        referralCode: 'fiverr-demo'
      }
    ],
    skipDuplicates: true 
  });

  // 2. Sales/Field Teams (OrganizationUser with specific roles/departments if schema supports, otherwise just ensure users exist)
  // For now, we will assume OrganizationUser is the main "Team" entity. 
  // If there are specific tables for "Sales Teams", we should use them. 
  // Based on previous schema reads, "TeamMember" might be relevant for Social, but "OrganizationUser" is general.
  
  // --- OPERATIONS: Projects, Inventory, Suppliers, Orders ---
  console.log('⚙️ Seeding Operations module...');

  // 1. Suppliers
  const supplier1 = await prisma.operationsSupplier.create({
    data: {
      organizationId: ORG_ID,
      name: 'מחסני חשמל סיטונאות',
      contactName: 'אבי לוי',
      phone: '050-1112222',
      email: 'orders@mahsaney.co.il',
      notes: 'כתובת: החשמל 4, תל אביב | קטגוריה: ELECTRONICS | סטטוס: ACTIVE | תנאי תשלום: NET30'
    }
  });

  const supplier2 = await prisma.operationsSupplier.create({
    data: {
      organizationId: ORG_ID,
      name: 'רהיטי המשרד בע"מ',
      contactName: 'שלומי כהן',
      phone: '052-3334444',
      email: 'info@rahitim.co.il',
      notes: 'כתובת: הרצל 80, ראשון לציון | קטגוריה: FURNITURE | סטטוס: ACTIVE | תנאי תשלום: NET60'
    }
  });

  // 2. Inventory Items
  const item1 = await prisma.operationsItem.create({
    data: {
      organizationId: ORG_ID,
      supplierId: supplier1.id,
      name: 'מחשב נייד Dell XPS',
      sku: 'DELL-XPS-15',
      unit: 'יחידה',
      cost: 7500
    }
  });

  const item2 = await prisma.operationsItem.create({
    data: {
      organizationId: ORG_ID,
      supplierId: supplier2.id,
      name: 'כיסא ארגונומי Herman Miller',
      sku: 'HM-AERON',
      unit: 'יחידה',
      cost: 4200
    }
  });

  // 3. Purchase Orders
  await prisma.operationsPurchaseOrder.create({
    data: {
      organizationId: ORG_ID,
      supplierId: supplier1.id,
      poNumber: 'PO-2024-001',
      status: 'SUBMITTED',
      totalAmount: 37500, // 5 * 7500
      expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
      notes: 'אספקה דחופה למשרדים החדשים',
      lineItems: {
        create: [
          {
            description: 'מחשב נייד Dell XPS',
            itemId: item1.id,
            quantity: 5,
            unitPrice: 7500,
            totalPrice: 37500
          }
        ]
      }
    }
  });

  // 4. Projects (OperationsProject)
  // Check if schema has OperationsProject - usually yes.
  // We'll try to find it in the schema context or just try to create it.
  // Based on previous contexts, it likely exists.
  
  // NOTE: If OperationsProject is missing in schema type definitions in this script, it might fail.
  // I will check for 'operationsProject' property on prisma.
  if ((prisma as any).operationsProject) {
    await (prisma as any).operationsProject.create({
        data: {
            organizationId: ORG_ID,
            name: 'הקמת משרדים חדשים - קומה 3',
            description: 'שיפוץ, ריהוט וציוד מחשוב לקומה החדשה',
            status: 'IN_PROGRESS',
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            budget: 150000,
            priority: 'HIGH'
        }
    });
  } else {
      console.log('⚠️ OperationsProject model not found in Prisma Client');
  }

  // --- SOCIAL: Strategy, Content ---
  console.log('📣 Seeding Social module...');

  // 1. Social Strategy / Content
  // Assuming 'socialPost' or similar.
  if ((prisma as any).socialPost) {
      await (prisma as any).socialPost.createMany({
          data: [
              {
                  organizationId: ORG_ID,
                  content: 'טיפ מספר 1 לעסקים: תמיד תבדקו את ה-ROI שלכם! 📈 #business #tips',
                  status: 'draft',
                  scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
              },
              {
                  organizationId: ORG_ID,
                  content: 'שבוע טוב לכולם! מה המטרות שלכם להשבוע? 🎯',
                  status: 'published',
                  published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              }
          ]
      });
  }

  // 2. Content Bank / Assets
  // If there's a 'socialMediaAsset' or similar? 
  // Let's look at what we saw in schema... 'SocialMediaTask' exists.
  if ((prisma as any).socialMediaTask) {
      await (prisma as any).socialMediaTask.createMany({
          data: [
              {
                  organizationId: ORG_ID,
                  title: 'לצלם סרטון טיקטוק על AI',
                  description: 'סקירה של הכלי החדש',
                  status: 'todo',
                  priority: 'high',
                  due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                  type: 'content_creation'
              },
              {
                  organizationId: ORG_ID,
                  title: 'עיצוב פוסט לאינסטגרם',
                  description: 'לפי הגריד החדש',
                  status: 'in_progress',
                  priority: 'medium',
                  due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
                  type: 'design'
              }
          ]
      });
  }

  console.log('✅ Seeding completed!');
  await prisma.$disconnect();
}

main().catch(e => {
    console.error('❌ Error seeding:', e);
    prisma.$disconnect();
});
