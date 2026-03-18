import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';

async function main() {
  console.log('🔍 בדיקת נתוני Client Portal\n');
  
  // 1. Check ClientClient
  const clients = await prisma.clientClient.findMany({
    where: { organizationId: ORG_ID },
    select: {
      id: true,
      fullName: true,
      companyName: true,
    }
  });
  
  console.log(`📊 לקוחות (ClientClient): ${clients.length}`);
  clients.slice(0, 5).forEach(c => {
    console.log(`  - ${c.fullName} (${c.companyName || 'no company'})`);
  });
  
  // 2. Check tasks
  const tasks = await prisma.clientTask.findMany({
    where: { 
      client: { organizationId: ORG_ID }
    },
    select: {
      id: true,
      title: true,
      status: true,
      clientId: true,
    }
  });
  
  console.log(`\n� משימות (ClientTask): ${tasks.length}`);
  const tasksByStatus = tasks.reduce((acc: Record<string, number>, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});
  console.log('  סטטוסים:', tasksByStatus);
  
  // 3. Check sessions/meetings
  const sessions = await prisma.clientSession.findMany({
    where: { 
      client: { organizationId: ORG_ID }
    },
    select: {
      id: true,
      sessionType: true,
      startAt: true,
      clientId: true,
    }
  }) as Array<{ id: string; sessionType: string | null; startAt: Date; clientId: string }>;
  
  console.log(`\n🗓️ פגישות (ClientSession): ${sessions.length}`);
  sessions.slice(0, 3).forEach(s => {
    console.log(`  - ${s.sessionType || 'פגישה'} (${s.startAt.toISOString()})`);
  });
  
  // 4. Check misradClient (for portal)
  const misradClients = await prisma.misradClient.findMany({
    where: { organizationId: ORG_ID },
    select: {
      id: true,
      name: true,
      mainContact: true,
      value: true,
      journeyStages: {
        select: {
          id: true,
          name: true,
          status: true,
        }
      },
      actions: {
        select: {
          id: true,
          title: true,
          status: true,
        }
      }
    }
  }) as Array<{
    id: string;
    name: string;
    mainContact: string;
    value: number | null;
    journeyStages: Array<{ id: string; name: string; status: string }>;
    actions: Array<{ id: string; title: string; status: string }>;
  }>;
  
  console.log(`\n💼 Misrad Clients (Portal): ${misradClients.length}`);
  misradClients.slice(0, 5).forEach(c => {
    console.log(`  - ${c.name}: ₪${c.value || 0}`);
    console.log(`    Journey stages: ${c.journeyStages.length}`);
    console.log(`    Actions: ${c.actions.length}`);
  });
  
  console.log('\n═══ סיכום ═══');
  if (clients.length === 0 && misradClients.length === 0) {
    console.log('❌ אין לקוחות במערכת!');
  }
  if (tasks.length === 0 && misradClients.every(c => c.actions.length === 0)) {
    console.log('❌ אין משימות!');
  }
  if (sessions.length === 0) {
    console.log('❌ אין פגישות!');
  }
  if (misradClients.every(c => c.journeyStages.length === 0)) {
    console.log('❌ אין שלבי Journey!');
  }
  
  await prisma.$disconnect();
}

main();
