import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';

async function main() {
  console.log('🔍 בדיקת MisradClient נתונים\n');
  
  const clients = await prisma.misradClient.findMany({
    where: { organizationId: ORG_ID },
    include: {
      journeyStages: true,
      actions: true,
      meetings: true,
    }
  });
  
  console.log(`📊 סה"כ MisradClients: ${clients.length}\n`);
  
  clients.forEach((c, idx) => {
    console.log(`\n═══ לקוח ${idx + 1}: ${c.name} ═══`);
    console.log(`  💰 monthlyRetainer: ₪${c.monthlyRetainer}`);
    console.log(`  👤 mainContact: ${c.mainContact}`);
    console.log(`  📊 healthScore: ${c.healthScore}`);
    console.log(`  🎯 Journey Stages: ${c.journeyStages.length}`);
    c.journeyStages.forEach(s => {
      console.log(`     - ${s.name} (${s.status})`);
    });
    console.log(`  ✅ Actions: ${c.actions.length}`);
    c.actions.forEach(a => {
      console.log(`     - ${a.title} (${a.status})`);
    });
    console.log(`  🗓️ Meetings: ${c.meetings.length}`);
    c.meetings.forEach(m => {
      console.log(`     - ${m.title} (${m.date})`);
    });
  });
  
  console.log('\n═══ סיכום ═══');
  if (clients.length === 0) {
    console.log('❌ אין MisradClients! צריך ליצור נתוני demo');
  } else {
    const allZero = clients.every(c => c.monthlyRetainer === 0);
    if (allZero) {
      console.log('⚠️  כל הלקוחות עם 0₪ - צריך לעדכן');
    }
    
    const noStages = clients.every(c => c.journeyStages.length === 0);
    if (noStages) {
      console.log('⚠️  אין שלבי Journey - צריך ליצור');
    }
    
    const noActions = clients.every(c => c.actions.length === 0);
    if (noActions) {
      console.log('⚠️  אין Actions - צריך ליצור');
    }
    
    const noMeetings = clients.every(c => c.meetings.length === 0);
    if (noMeetings) {
      console.log('⚠️  אין Meetings - צריך ליצור');
    }
  }
  
  await prisma.$disconnect();
}

main();
