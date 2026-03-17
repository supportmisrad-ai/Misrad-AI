const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function checkAndFixClientMappings() {
  console.log('🔍 Checking ClientClient -> MisradClient mappings...');
  
  try {
    // Get the correct organization ID from slug
    const org = await prisma.organization.findUnique({
      where: { slug: 'misrad-ai-hq' },
      select: { id: true }
    });

    if (!org) {
      throw new Error('Organization misrad-ai-hq not found');
    }

    console.log(`📊 Using organization ID: ${org.id}`);

    // Get all ClientClients
    const clientClients = await prisma.clientClient.findMany({
      where: { organizationId: org.id },
      select: {
        id: true,
        fullName: true,
        organizationId: true,
      },
    });

    console.log(`📊 Found ${clientClients.length} ClientClients`);

    // Check which ones have MisradClient records
    const misradClients = await prisma.misradClient.findMany({
      where: {
        organizationId: org.id,
        clientClientId: { not: null },
      },
      select: {
        id: true,
        clientClientId: true,
      },
    });

    console.log(`📊 Found ${misradClients.length} MisradClients with ClientClient links`);

    const linkedClientIds = new Set(misradClients.map(mc => mc.clientClientId));
    const unlinkedClients = clientClients.filter(cc => !linkedClientIds.has(cc.id));

    console.log(`⚠️  Found ${unlinkedClients.length} ClientClients without MisradClient records`);

    if (unlinkedClients.length > 0) {
      console.log('🔧 Creating missing MisradClient records...');
      
      for (const client of unlinkedClients) {
        await prisma.misradClient.create({
          data: {
            organizationId: client.organizationId,
            clientClientId: client.id,
            name: client.fullName,
            industry: '',
            employeeCount: 0,
            logoInitials: client.fullName
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0])
              .join('')
              .toUpperCase(),
            healthBreakdown: {},
            engagementMetrics: {},
            healthScore: 75,
            healthStatus: 'STABLE',
            type: 'RETAINER',
            tags: [],
            status: 'ACTIVE',
            monthlyRetainer: 0,
            profitMargin: 0,
            lifetimeValue: 0,
            hoursLogged: 0,
            internalHourlyRate: 0,
            directExpenses: 0,
            profitabilityVerdict: '',
            lastContact: new Date().toISOString().split('T')[0],
            nextRenewal: '',
            mainContact: client.fullName,
            mainContactRole: '',
            strengths: [],
            weaknesses: [],
            sentimentTrend: [],
            referralStatus: 'LOCKED',
          },
        });
        console.log(`✅ Created MisradClient for ${client.fullName} (${client.id})`);
      }
    }

    console.log('✅ Client mapping check completed successfully');
    return { success: true, fixed: unlinkedClients.length };
    
  } catch (error) {
    console.error('❌ Error fixing client mappings:', error);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  checkAndFixClientMappings()
    .then(result => {
      console.log('Final result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { checkAndFixClientMappings };
