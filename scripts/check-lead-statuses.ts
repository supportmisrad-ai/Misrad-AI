import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';

async function main() {
  const leads = await prisma.systemLead.findMany({
    where: { organizationId: ORG_ID },
    select: { status: true },
  });
  
  const statuses = new Set(leads.map(l => l.status));
  console.log('Unique statuses in DB:', Array.from(statuses));
  console.log('Total leads:', leads.length);
  
  // Check if statuses match expected types
  const expected = ['incoming', 'contacted', 'meeting', 'proposal', 'negotiation', 'won', 'lost', 'churned'];
  const unexpected = Array.from(statuses).filter(s => !expected.includes(s as string));
  
  if (unexpected.length > 0) {
    console.log('\n❌ Unexpected statuses found:', unexpected);
  } else {
    console.log('\n✅ All statuses are valid');
  }
  
  await prisma.$disconnect();
}

main();
