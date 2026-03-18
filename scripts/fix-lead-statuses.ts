import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';

// Map Hebrew to English statuses
const statusMap: Record<string, string> = {
  'חדש': 'incoming',
  'נוצר קשר': 'contacted',
  'פגישה תואמה': 'meeting',
  'הצעת מחיר': 'proposal',
  'משא ומתן': 'negotiation',
  'זכייה': 'won',
  'הפסד': 'lost',
};

async function main() {
  console.log('🔧 Fixing lead statuses from Hebrew to English...\n');
  
  const leads = await prisma.systemLead.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true, name: true, status: true }
  });
  
  console.log(`Found ${leads.length} leads to update\n`);
  
  let updated = 0;
  for (const lead of leads) {
    const hebrewStatus = lead.status;
    const englishStatus = statusMap[hebrewStatus];
    
    if (englishStatus) {
      await prisma.systemLead.update({
        where: { id: lead.id },
        data: { status: englishStatus }
      });
      console.log(`✅ ${lead.name}: '${hebrewStatus}' → '${englishStatus}'`);
      updated++;
    } else {
      console.log(`⚠️  ${lead.name}: status '${hebrewStatus}' already valid or unknown`);
    }
  }
  
  console.log(`\n✅ Updated ${updated} leads`);
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
