import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';

// Map English back to Hebrew
const statusMap: Record<string, string> = {
  'incoming': 'חדש',
  'contacted': 'נוצר קשר',
  'meeting': 'פגישה תואמה',
  'proposal': 'הצעת מחיר',
  'negotiation': 'משא ומתן',
  'won': 'זכייה',
  'lost': 'הפסד',
  'churned': 'נטישה',
};

async function main() {
  console.log('🔄 מחזיר את הסטטוסים לעברית כמו שצריך במערכת ישראלית!\n');
  
  const leads = await prisma.systemLead.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true, name: true, status: true }
  });
  
  console.log(`נמצאו ${leads.length} לידים לעדכון\n`);
  
  let updated = 0;
  for (const lead of leads) {
    const englishStatus = lead.status;
    const hebrewStatus = statusMap[englishStatus];
    
    if (hebrewStatus) {
      await prisma.systemLead.update({
        where: { id: lead.id },
        data: { status: hebrewStatus }
      });
      console.log(`✅ ${lead.name}: '${englishStatus}' → '${hebrewStatus}'`);
      updated++;
    } else if (englishStatus && !Object.values(statusMap).includes(englishStatus)) {
      console.log(`⚠️  ${lead.name}: סטטוס '${englishStatus}' לא ידוע`);
    } else {
      console.log(`✓  ${lead.name}: כבר בעברית - '${englishStatus}'`);
    }
  }
  
  console.log(`\n✅ עודכנו ${updated} לידים לעברית`);
  
  // Verify
  const sample = await prisma.systemLead.findMany({
    where: { organizationId: ORG_ID },
    select: { status: true },
    take: 10
  });
  
  const statuses = new Set(sample.map(l => l.status));
  console.log('\nסטטוסים בדגימה:', Array.from(statuses));
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
