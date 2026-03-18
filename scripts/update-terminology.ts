import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';

// Map old terminology to business-friendly Hebrew
const statusMap: Record<string, string> = {
  'זכייה': 'סגור',
  'הפסד': 'לא רלוונטי',
};

async function main() {
  console.log('🔄 מעדכן טרמינולוגיה למילים עסקיות ישראליות\n');
  
  const leads = await prisma.systemLead.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true, name: true, status: true }
  });
  
  console.log(`נמצאו ${leads.length} לידים\n`);
  
  let updated = 0;
  for (const lead of leads) {
    const oldStatus = lead.status;
    const newStatus = statusMap[oldStatus];
    
    if (newStatus) {
      await prisma.systemLead.update({
        where: { id: lead.id },
        data: { status: newStatus }
      });
      console.log(`✅ ${lead.name}: '${oldStatus}' → '${newStatus}'`);
      updated++;
    }
  }
  
  console.log(`\n✅ עודכנו ${updated} לידים`);
  
  // Verify
  const statuses = await prisma.systemLead.groupBy({
    by: ['status'],
    where: { organizationId: ORG_ID },
    _count: true
  });
  
  console.log('\nסטטוסים במערכת:');
  statuses.forEach(s => {
    console.log(`  - ${s.status}: ${s._count} לידים`);
  });
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
