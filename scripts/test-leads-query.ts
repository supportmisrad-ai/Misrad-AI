import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';
const CLERK_ID = 'user_39UkuSmIkk20b1MuAahuYqWHKoe';

// Simulate EXACTLY what getSystemLeadsPage does
async function simulateGetSystemLeadsPage() {
  console.log('=== Simulating getSystemLeadsPage ===\n');
  
  // 1. Get user
  const orgUser = await prisma.organizationUser.findUnique({
    where: { clerk_user_id: CLERK_ID },
    select: { id: true, role: true, organization_id: true }
  });
  console.log('1. OrganizationUser:', orgUser);
  
  if (!orgUser || orgUser.organization_id !== ORG_ID) {
    console.log('❌ User not in demo org!');
    return;
  }
  
  // 2. Determine role
  const role = String(orgUser.role || '').toLowerCase();
  const userRole = ['super_admin', 'admin', 'owner'].includes(role) ? 'admin' : 'agent';
  console.log('2. userRole:', userRole, '(role from DB:', role + ')');
  
  // 3. Build filter (EXACT logic from getSystemLeadsPage)
  const currentNexusUserId = orgUser.id;
  let agentFilter: any = {};
  
  if (userRole === 'agent' && currentNexusUserId) {
    agentFilter = { 
      OR: [
        { assignedAgentId: currentNexusUserId }, 
        { assignedAgentId: null }
      ] 
    };
    console.log('3. Agent filter applied:', JSON.stringify(agentFilter));
  } else {
    console.log('3. No agent filter (admin sees all)');
  }
  
  // 4. Build WHERE clause
  const where: any = {
    organizationId: ORG_ID,
    AND: [agentFilter].filter((f) => Object.keys(f).length > 0),
  };
  console.log('4. WHERE clause:', JSON.stringify(where, null, 2));
  
  // 5. Execute query
  const rows = await prisma.systemLead.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 51,
  });
  
  console.log('5. Query returned', rows.length, 'leads');
  
  if (rows.length === 0) {
    console.log('❌ NO LEADS RETURNED!');
  } else {
    console.log('✅ Leads found:');
    rows.slice(0, 3).forEach(l => {
      console.log('   -', l.name, '| agent:', l.assignedAgentId || 'null');
    });
  }
}

simulateGetSystemLeadsPage()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
