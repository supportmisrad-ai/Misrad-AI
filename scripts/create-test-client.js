const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function createTestClient() {
  try {
    // Get the correct organization ID from slug
    const org = await prisma.organization.findUnique({
      where: { slug: 'misrad-ai-hq' },
      select: { id: true }
    });

    if (!org) {
      throw new Error('Organization misrad-ai-hq not found');
    }

    console.log(`📊 Creating test client in organization: ${org.id}`);

    // Create a test ClientClient
    const testClient = await prisma.clientClient.create({
      data: {
        organizationId: org.id,
        fullName: 'לקוח בדיקה',
        phone: '0541234567',
        email: 'test@example.com',
        notes: 'לקוח לבדיקת יצירת משימות',
      },
    });

    console.log(`✅ Created ClientClient: ${testClient.fullName} (${testClient.id})`);

    // Create corresponding MisradClient
    const misradClient = await prisma.misradClient.create({
      data: {
        organizationId: org.id,
        clientClientId: testClient.id,
        name: testClient.fullName,
        industry: 'בדיקה',
        employeeCount: 5,
        logoInitials: 'לב',
        healthBreakdown: {},
        engagementMetrics: {},
        healthScore: 85,
        healthStatus: 'STABLE',
        type: 'RETAINER',
        tags: ['בדיקה'],
        status: 'ACTIVE',
        monthlyRetainer: 1000,
        profitMargin: 20,
        lifetimeValue: 12000,
        hoursLogged: 0,
        internalHourlyRate: 150,
        directExpenses: 200,
        profitabilityVerdict: 'רווחי',
        lastContact: new Date().toISOString().split('T')[0],
        nextRenewal: '2026-04-01',
        mainContact: testClient.fullName,
        mainContactRole: 'מנהל פרויקט',
        strengths: ['חדשנות'],
        weaknesses: ['אין'],
        sentimentTrend: [],
        referralStatus: 'LOCKED',
      },
    });

    console.log(`✅ Created MisradClient: ${misradClient.name} (${misradClient.id})`);

    return { success: true, clientId: testClient.id, misradClientId: misradClient.id };
    
  } catch (error) {
    console.error('❌ Error creating test client:', error);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  createTestClient()
    .then(result => {
      console.log('Final result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createTestClient };
