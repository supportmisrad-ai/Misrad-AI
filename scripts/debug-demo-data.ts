const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';

async function main() {
  console.log('🔍 Checking organization:', ORG_ID);
  
  const org = await prisma.organization.findUnique({
    where: { id: ORG_ID },
    select: { id: true, name: true, slug: true }
  });
  console.log('Organization:', org);
  
  const counts = await Promise.all([
    prisma.clientClient.count({ where: { organizationId: ORG_ID } }),
    prisma.systemLead.count({ where: { organizationId: ORG_ID } }),
    prisma.nexusUser.count({ where: { organizationId: ORG_ID } }),
    prisma.clientTask.count({ where: { organizationId: ORG_ID } }),
    prisma.clientPortalUser.count({ where: { organizationId: ORG_ID } }),
    prisma.systemSupportTicket.count({ where: { organizationId: ORG_ID } })
  ]);
  
  console.log('\n📊 Counts for org ' + ORG_ID + ':');
  console.log('  ClientClient:', counts[0]);
  console.log('  SystemLead:', counts[1]);
  console.log('  NexusUser:', counts[2]);
  console.log('  ClientTask:', counts[3]);
  console.log('  ClientPortalUser:', counts[4]);
  console.log('  SystemSupportTicket:', counts[5]);
  
  if (counts[0] === 0 && counts[1] === 0) {
    console.log('\n❌ No data found in this org!');
    
    // Check recent clients in ANY org
    const recent = await prisma.clientClient.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { id: true, organizationId: true, companyName: true, createdAt: true }
    });
    console.log('\nMost recent client anywhere:', recent);
    
    // Check all orgs
    const orgs = await prisma.organization.findMany({
      select: { id: true, name: true, slug: true },
      take: 10
    });
    console.log('\nAll organizations:', orgs);
  }
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
