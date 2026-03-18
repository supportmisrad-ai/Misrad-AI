import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ORG_SLUG = 'misrad-ai-demo-il';
const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';
const CLERK_ID = 'user_39UkuSmIkk20b1MuAahuYqWHKoe';

async function simulateServerAction() {
  console.log('=== Simulating getSystemLeadsPage server action ===\n');
  
  // Step 1: Check org exists
  const org = await prisma.organization.findUnique({
    where: { id: ORG_ID },
    select: { id: true, slug: true, name: true }
  });
  console.log('1. Organization:', org);
  
  if (!org) {
    console.log('❌ Organization not found!');
    return;
  }
  
  // Step 2: Check user permissions
  const orgUser = await prisma.organizationUser.findUnique({
    where: { clerk_user_id: CLERK_ID },
    select: { id: true, role: true, organization_id: true }
  });
  console.log('2. User:', orgUser);
  
  if (!orgUser || orgUser.organization_id !== ORG_ID) {
    console.log('❌ User not member of this org!');
    return;
  }
  
  // Step 3: Query leads EXACTLY like server action does
  const role = String(orgUser.role || '').toLowerCase();
  const userRole = ['super_admin', 'admin', 'owner'].includes(role) ? 'admin' : 'agent';
  console.log('3. User role:', userRole);
  
  const agentFilter = userRole === 'agent' && orgUser.id
    ? { OR: [{ assignedAgentId: orgUser.id }, { assignedAgentId: null }] }
    : {};
  
  const where = {
    organizationId: ORG_ID,
    AND: Object.keys(agentFilter).length > 0 ? [agentFilter] : []
  };
  
  console.log('4. WHERE clause:', JSON.stringify(where, null, 2));
  
  const leads = await prisma.systemLead.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 10
  });
  
  console.log('5. Query returned:', leads.length, 'leads');
  
  if (leads.length > 0) {
    console.log('\nSample lead:');
    console.log('  Name:', leads[0].name);
    console.log('  Status:', leads[0].status);
    console.log('  Phone:', leads[0].phone);
    console.log('  Created:', leads[0].createdAt);
  } else {
    console.log('\n❌ NO LEADS RETURNED BY QUERY!');
  }
  
  await prisma.$disconnect();
}

simulateServerAction();
