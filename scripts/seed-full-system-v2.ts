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

  // --- SYSTEM: Partners ---
  console.log('📦 Seeding System module (Partners)...');
  
  const partnersData = [
    {
      name: 'Wix Israel',
      email: 'partners@wix.com',
      phone: '03-5555555'
    },
    {
      name: 'Fiverr Partners',
      email: 'affiliates@fiverr.com',
      phone: '03-6666666'
    }
  ];

  for (const p of partnersData) {
    // Check if exists by referral code or create
    // Since referralCode is unique, we generate one
    const code = 'REF-' + Math.floor(Math.random() * 100000);
    await prisma.partner.create({
      data: {
        name: p.name,
        referralCode: code,
        email: p.email,
        phone: p.phone,
        organizations: {
          connect: { id: ORG_ID }
        }
      }
    });
  }

  // --- OPERATIONS: Suppliers, Items, Inventory, POs, Projects ---
  console.log('⚙️ Seeding Operations module...');

  // 1. Suppliers
  // Note: 'address', 'category', 'status', 'paymentTerms' are put in notes or ignored as they don't exist in schema
  const supplier1 = await prisma.operationsSupplier.create({
    data: {
      organizationId: ORG_ID,
      name: 'מחסני חשמל סיטונאות',
      contactName: 'אבי לוי',
      phone: '050-1112222',
      email: 'orders@mahsaney.co.il',
      notes: 'Address: החשמל 4, תל אביב. Terms: NET30. Category: ELECTRONICS'
    }
  });

  const supplier2 = await prisma.operationsSupplier.create({
    data: {
      organizationId: ORG_ID,
      name: 'רהיטי המשרד בע"מ',
      contactName: 'שלומי כהן',
      phone: '052-3334444',
      email: 'info@rahitim.co.il',
      notes: 'Address: הרצל 80, ראשון לציון. Terms: NET60. Category: FURNITURE'
    }
  });

  // 2. Inventory Items & Inventory Levels
  // OperationsItem = Catalog
  // OperationsInventory = Stock
  
  const item1Catalog = await prisma.operationsItem.create({
    data: {
      organizationId: ORG_ID,
      supplierId: supplier1.id,
      name: 'מחשב נייד Dell XPS',
      sku: 'DELL-XPS-15',
      cost: 7500,
      unit: 'pcs'
    }
  });

  // Inventory for Item 1
  await prisma.operationsInventory.create({
    data: {
      organizationId: ORG_ID,
      itemId: item1Catalog.id,
      minLevel: 2,
      onHand: 5
    }
  });

  const item2Catalog = await prisma.operationsItem.create({
    data: {
      organizationId: ORG_ID,
      supplierId: supplier2.id,
      name: 'כיסא ארגונומי Herman Miller',
      sku: 'HM-AERON',
      unit: 'pcs',
      cost: 4200
    }
  });

  // Inventory for Item 2
  await prisma.operationsInventory.create({
    data: {
      organizationId: ORG_ID,
      itemId: item2Catalog.id,
      minLevel: 3,
      onHand: 1
    }
  });

  // 3. Purchase Orders
  await prisma.operationsPurchaseOrder.create({
    data: {
      organizationId: ORG_ID,
      supplierId: supplier1.id,
      poNumber: 'PO-2024-' + Math.floor(Math.random() * 10000),
      status: 'SUBMITTED',
      totalAmount: 37500,
      expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: 'אספקה דחופה למשרדים החדשים',
      lineItems: {
        create: [
          {
            description: 'מחשב נייד Dell XPS',
            itemId: item1Catalog.id,
            quantity: 5,
            unitPrice: 7500,
            totalPrice: 37500
          }
        ]
      }
    }
  });

  // 4. Projects
  // operations_projects table
  // Check if operationsProject exists on prisma client (it should based on schema)
  await prisma.operationsProject.create({
    data: {
        organizationId: ORG_ID,
        title: 'הקמת משרדים חדשים - קומה 3',
        // description is not in schema, status defaults to ACTIVE
        status: 'ACTIVE',
        installationAddress: 'דרך מנחם בגין 120, תל אביב'
    }
  });

  // --- SOCIAL: Posts, Tasks ---
  console.log('📣 Seeding Social module...');

  // Fetch a client for SocialPost
  const someClient = await prisma.misradClient.findFirst({ where: { organizationId: ORG_ID } });
  
  if (someClient) {
      // 1. Social Posts
      // Use createMany for multiple posts
      await prisma.socialPost.createMany({
          data: [
              {
                  organizationId: ORG_ID,
                  clientId: someClient.id,
                  content: 'טיפ מספר 1 לעסקים: תמיד תבדקו את ה-ROI שלכם! 📈 #business #tips',
                  status: 'draft',
                  scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
              },
              {
                  organizationId: ORG_ID,
                  clientId: someClient.id,
                  content: 'שבוע טוב לכולם! מה המטרות שלכם להשבוע? 🎯',
                  status: 'published',
                  published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              }
          ]
      });

      // 2. Social Tasks
      await prisma.socialMediaTask.createMany({
          data: [
              {
                  organizationId: ORG_ID,
                  client_id: someClient.id,
                  title: 'לצלם סרטון טיקטוק על AI',
                  description: 'סקירה של הכלי החדש',
                  status: 'todo',
                  priority: 'high',
                  due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                  type: 'content_creation'
              },
              {
                  organizationId: ORG_ID,
                  client_id: someClient.id,
                  title: 'עיצוב פוסט לאינסטגרם',
                  description: 'לפי הגריד החדש',
                  status: 'in_progress',
                  priority: 'medium',
                  due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
                  type: 'design'
              }
          ]
      });
  } else {
      console.log('⚠️ No client found for Social Posts, skipping posts creation.');
  }

  console.log('✅ Seeding completed!');
  await prisma.$disconnect();
}

main().catch(e => {
    console.error('❌ Error seeding:', e);
    prisma.$disconnect();
});
