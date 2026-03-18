import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';

const VALID_STATUSES = ['חדש', 'נוצר קשר', 'פגישה תואמה', 'הצעת מחיר', 'משא ומתן', 'סגור', 'לא רלוונטי', 'נטישה'];

async function main() {
  console.log('🔍 אימות סופי של סטטוסי לידים\n');
  
  const leads = await prisma.systemLead.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true, name: true, status: true }
  });
  
  console.log(`📊 סה"כ לידים: ${leads.length}\n`);
  
  const statusCounts = new Map<string, number>();
  const invalidLeads: Array<{id: string; name: string; status: string}> = [];
  
  leads.forEach(lead => {
    const count = statusCounts.get(lead.status) || 0;
    statusCounts.set(lead.status, count + 1);
    
    if (!VALID_STATUSES.includes(lead.status)) {
      invalidLeads.push(lead);
    }
  });
  
  console.log('═══ סטטוסים בשימוש ═══');
  statusCounts.forEach((count, status) => {
    const isValid = VALID_STATUSES.includes(status);
    console.log(`  ${isValid ? '✅' : '❌'} ${status}: ${count}`);
  });
  
  console.log('\n═══ תוצאות ═══');
  if (invalidLeads.length > 0) {
    console.log(`❌ נמצאו ${invalidLeads.length} לידים עם סטטוס לא חוקי:`);
    invalidLeads.forEach(lead => {
      console.log(`   - ${lead.name} (${lead.id}): "${lead.status}"`);
    });
  } else {
    console.log('✅ כל הלידים עם סטטוסים חוקיים!');
    console.log(`✅ ${leads.length} לידים מוכנים לתצוגה ב-UI`);
  }
  
  await prisma.$disconnect();
}

main();
