import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';

async function main() {
  const leads = await prisma.systemLead.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true, name: true, status: true, assignedAgentId: true }
  });
  console.log('Leads count:', leads.length);
  await prisma.$disconnect();
}

main();
