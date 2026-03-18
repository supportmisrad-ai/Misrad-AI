import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';

// סטטוסים חוקיים
const VALID_STATUSES = ['חדש', 'נוצר קשר', 'פגישה תואמה', 'הצעת מחיר', 'משא ומתן', 'זכייה', 'הפסד', 'נטישה'];

// מיפוי תיקונים
const STATUS_FIXES: Record<string, string> = {
  'סגור': 'זכייה',  // "סגור" זה בעצם "זכייה"
  'לא רלוונטי': 'הפסד',  // "לא רלוונטי" זה "הפסד"
  'חדש': 'חדש',
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
  console.log('🔧 תיקון סטטוסים לא חוקיים\n');
  
  // מצא את כל הסטטוסים הקיימים
  const allLeads = await prisma.systemLead.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true, name: true, status: true }
  });
  
  const statusCounts = new Map<string, number>();
  allLeads.forEach(lead => {
    const count = statusCounts.get(lead.status) || 0;
    statusCounts.set(lead.status, count + 1);
  });
  
  console.log('סטטוסים נוכחיים ב-DB:');
  statusCounts.forEach((count, status) => {
    const isValid = VALID_STATUSES.includes(status);
    console.log(`  ${isValid ? '✅' : '❌'} ${status}: ${count} לידים`);
  });
  
  // תקן סטטוסים לא חוקיים
  console.log('\n🔄 מתקן סטטוסים...\n');
  
  let fixed = 0;
  for (const lead of allLeads) {
    const currentStatus = lead.status;
    const fixedStatus = STATUS_FIXES[currentStatus] || currentStatus;
    
    if (currentStatus !== fixedStatus || !VALID_STATUSES.includes(currentStatus)) {
      await prisma.systemLead.update({
        where: { id: lead.id },
        data: { status: fixedStatus }
      });
      console.log(`✅ ${lead.name}: '${currentStatus}' → '${fixedStatus}'`);
      fixed++;
    }
  }
  
  if (fixed === 0) {
    console.log('✅ כל הסטטוסים תקינים!');
  } else {
    console.log(`\n✅ תוקנו ${fixed} לידים`);
  }
  
  // אימות סופי
  console.log('\n━━━ אימות סופי ━━━');
  const finalLeads = await prisma.systemLead.findMany({
    where: { organizationId: ORG_ID },
    select: { status: true }
  });
  
  const finalStatuses = new Set(finalLeads.map(l => l.status));
  const invalidStatuses = Array.from(finalStatuses).filter(s => !VALID_STATUSES.includes(s));
  
  if (invalidStatuses.length > 0) {
    console.log('❌ עדיין יש סטטוסים לא חוקיים:', invalidStatuses);
  } else {
    console.log('✅ כל הסטטוסים חוקיים!');
    console.log('   סטטוסים בשימוש:', Array.from(finalStatuses));
  }
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
