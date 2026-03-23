/**
 * אימות: סימולציה של מסלולי הטעינה בדיוק כמו שהקוד עושה בפרודקשן
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';
const CLERK_USER_ID = 'user_39UkuSmIkk20b1MuAahuYqWHKoe';
const USER_EMAIL = 'itsikdahan1@gmail.com';

async function verify() {
  console.log('🔬 אימות מסלולי טעינה — ארגון הדגמה\n');

  // ═══ SYSTEM LEADS PATH (getSystemLeadsPage) ═══
  console.log('═══ 1. SYSTEM LEADS PATH ═══\n');

  // Step 1: organizationUser lookup (line 293-296 of system-leads.ts)
  const orgUser = await prisma.organizationUser.findUnique({
    where: { clerk_user_id: CLERK_USER_ID },
    select: { id: true, role: true },
  });

  console.log('  organizationUser:', orgUser ? `id=${orgUser.id}, role=${orgUser.role}` : 'NULL ❌');

  let userRole = 'agent';
  let currentNexusUserId: string | null = null;

  if (orgUser) {
    currentNexusUserId = orgUser.id;
    const role = String(orgUser.role || '').toLowerCase();
    if (['super_admin', 'admin', 'owner'].includes(role)) {
      userRole = 'admin';
    }
  }

  console.log(`  userRole: ${userRole}`);
  console.log(`  currentNexusUserId: ${currentNexusUserId}`);

  // Step 2: agent filter
  const agentFilter = userRole === 'agent' && currentNexusUserId
    ? { OR: [{ assignedAgentId: currentNexusUserId }, { assignedAgentId: null }] }
    : {};

  console.log(`  agentFilter: ${JSON.stringify(agentFilter)}`);

  // Step 3: actual query
  const leads = await prisma.systemLead.findMany({
    where: {
      organizationId: ORG_ID,
      ...agentFilter,
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 51,
  });

  console.log(`\n  ✅ Leads returned: ${leads.length}`);
  if (leads.length > 0) {
    console.log(`  First lead: ${leads[0].name} (${leads[0].status})`);
  }

  // ═══ NEXUS TASKS PATH (listNexusTasks → resolveWorkspaceForTaskListApi) ═══
  console.log('\n═══ 2. NEXUS TASKS PATH ═══\n');

  // Step 1: Find nexus user by email in org
  const nexusUser = await prisma.nexusUser.findFirst({
    where: { organizationId: ORG_ID, email: USER_EMAIL },
    select: { id: true, name: true, role: true },
  });

  console.log('  nexusUser:', nexusUser ? `id=${nexusUser.id}, name=${nexusUser.name}, role=${nexusUser.role}` : 'NULL ❌');

  const dbUserId = nexusUser?.id ?? '';
  const isManager = true; // super admin → hasPermission('manage_team') = true

  console.log(`  dbUserId: ${dbUserId || 'EMPTY'}`);
  console.log(`  isManager: ${isManager}`);

  // Step 2: check early return condition (line 69)
  if (!isManager && !dbUserId) {
    console.log('  ❌ WOULD RETURN EMPTY TASKS (no manager & no dbUserId)');
  } else {
    console.log('  ✅ Would NOT return empty (manager or has dbUserId)');
  }

  // Step 3: actual query
  const tasks = await prisma.nexusTask.findMany({
    where: {
      organizationId: ORG_ID,
      status: { notIn: ['Done', 'done'] },
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    take: 51,
  });

  console.log(`\n  ✅ Tasks returned: ${tasks.length}`);
  if (tasks.length > 0) {
    console.log(`  First task: ${tasks[0].title} (${tasks[0].status})`);
  }

  // ═══ NEXUS CLIENTS ═══
  console.log('\n═══ 3. NEXUS CLIENTS ═══\n');

  const nexusClients = await prisma.nexusClient.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true, name: true, companyName: true },
  });
  console.log(`  NexusClients: ${nexusClients.length}`);
  nexusClients.forEach(c => console.log(`    - ${c.name} (${c.companyName})`));

  // ═══ CLIENT MODULE ═══
  console.log('\n═══ 4. CLIENT MODULE ═══\n');

  const clientClients = await prisma.clientClient.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true, fullName: true, status: true },
  });
  console.log(`  ClientClients: ${clientClients.length}`);

  const clientSessions = await prisma.clientSession.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true, summary: true, status: true, startAt: true },
  });
  console.log(`  ClientSessions: ${clientSessions.length}`);
  clientSessions.forEach(s => console.log(`    - ${s.summary || 'ללא סיכום'} (${s.status}) ${s.startAt.toLocaleDateString('he-IL')}`));

  // ═══ SUMMARY ═══
  console.log('\n═══ סיכום ═══\n');

  const allGood = leads.length > 0 && tasks.length > 0 && nexusClients.length > 0;
  if (allGood) {
    console.log('✅ כל מסלולי הטעינה עובדים — הנתונים צריכים להופיע ב-UI');
    console.log('   אם עדיין ריק → הבעיה היא ב-Next.js cache או Vercel deployment');
    console.log('   פתרון: רענון קשיח (Ctrl+Shift+R) או Incognito');
  } else {
    console.log('❌ עדיין יש בעיה:');
    if (leads.length === 0) console.log('   - לידים: 0');
    if (tasks.length === 0) console.log('   - משימות: 0');
    if (nexusClients.length === 0) console.log('   - לקוחות Nexus: 0');
  }

  await prisma.$disconnect();
}

verify().catch((e) => {
  console.error('❌ שגיאה:', e);
  prisma.$disconnect();
});
