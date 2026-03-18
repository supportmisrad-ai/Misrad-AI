const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';

async function main() {
  console.log('🔍 Checking Demo Data...\n');
  
  const clients = await prisma.clientClient.count({ where: { organizationId: ORG_ID } });
  const tasks = await prisma.clientTask.count({ where: { organizationId: ORG_ID } });
  const portalUsers = await prisma.clientPortalUser.count({ where: { organizationId: ORG_ID } });
  const socialClients = await prisma.clients.count({ where: { organization_id: ORG_ID } });
  const campaigns = await prisma.socialMediaCampaign.count({ where: { organizationId: ORG_ID } });
  const tickets = await prisma.systemSupportTicket.count({ where: { organizationId: ORG_ID } });
  const employees = await prisma.nexusUser.count({ where: { organizationId: ORG_ID } });
  
  console.log('📊 Results:');
  console.log('─────────────────────────────');
  console.log(`ClientClient: ${clients}`);
  console.log(`NexusUser (Employees): ${employees}`);
  console.log(`ClientTask: ${tasks}`);
  console.log(`ClientPortalUser: ${portalUsers}`);
  console.log(`Social Clients (legacy): ${socialClients}`);
  console.log(`SocialMediaCampaign: ${campaigns}`);
  console.log(`SystemSupportTicket: ${tickets}`);
  console.log('─────────────────────────────\n');
  
  // Check if clients have manager metadata
  const sampleClient = await prisma.clientClient.findFirst({
    where: { organizationId: ORG_ID },
    select: { fullName: true, contactPerson: true, metadata: true }
  });
  
  if (sampleClient) {
    console.log('👤 Sample Client:');
    console.log(`Name: ${sampleClient.fullName}`);
    console.log(`Contact Person: ${sampleClient.contactPerson}`);
    console.log(`Metadata:`, sampleClient.metadata);
  }
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
