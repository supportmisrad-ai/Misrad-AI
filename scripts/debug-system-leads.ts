import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';
const CLERK_ID = 'user_39UkuSmIkk20b1MuAahuYqWHKoe';

async function main() {
  console.log('=== Debugging System Leads ===\n');
  
  // 1. Check current user
  const orgUser = await prisma.organizationUser.findUnique({
    where: { clerk_user_id: CLERK_ID },
    select: { id: true, role: true, organization_id: true }
  });
  console.log('1. Current user org membership:');
  console.log('   org_id:', orgUser?.organization_id);
  console.log('   role:', orgUser?.role);
  console.log('   Expected org:', ORG_ID);
  console.log('   Match:', orgUser?.organization_id === ORG_ID ? '✅' : '❌');
  
  // 2. Count all leads for this org
  const totalLeads = await prisma.systemLead.count({
    where: { organizationId: ORG_ID }
  });
  console.log('\n2. Total SystemLead count for org:', totalLeads);
  
  // 3. Get sample leads
  if (totalLeads > 0) {
    const leads = await prisma.systemLead.findMany({
      where: { organizationId: ORG_ID },
      take: 3,
      select: { 
        id: true, 
        name: true, 
        assignedAgentId: true,
        status: true 
      }
    });
    console.log('\n3. Sample leads:');
    leads.forEach(l => console.log('   -', l.name, '| status:', l.status, '| agent:', l.assignedAgentId || 'null'));
    
    // 4. Check assignedAgentId distribution
    const withAgent = await prisma.systemLead.count({
      where: { organizationId: ORG_ID, assignedAgentId: { not: null } }
    });
    const withoutAgent = await prisma.systemLead.count({
      where: { organizationId: ORG_ID, assignedAgentId: null }
    });
    console.log('\n4. AssignedAgentId distribution:');
    console.log('   With agent:', withAgent);
    console.log('   Without agent (null):', withoutAgent);
  }
  
  // 5. Check if there's a different org with leads
  const allOrgsWithLeads = await prisma.systemLead.groupBy({
    by: ['organizationId'],
    _count: { id: true }
  });
  console.log('\n5. All orgs with SystemLead counts:');
  allOrgsWithLeads.forEach(o => {
    console.log('   ', o.organizationId, ':', o._count.id, o.organizationId === ORG_ID ? '← DEMO ORG' : '');
  });
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
