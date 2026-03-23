/**
 * תיקון שורשי מקיף: הוספת היוזר האמיתי לכל הטבלאות הנדרשות בארגון הדגמה
 * + יצירת NexusClient רשומות חסרות + השלמת נתונים
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';
const CLERK_USER_ID = 'user_39UkuSmIkk20b1MuAahuYqWHKoe';
const USER_EMAIL = 'itsikdahan1@gmail.com';
const USER_NAME = 'יצחק דהן';

async function comprehensiveFix() {
  console.log('🔧 תיקון שורשי מקיף — ארגון הדגמה\n');
  console.log('='.repeat(60));

  // ── 1. organization_users — הוספת היוזר האמיתי ──
  console.log('\n🔹 1. organization_users — הוספת היוזר האמיתי...');

  // clerk_user_id is globally unique — find the existing record regardless of org
  const existingOrgUser = await prisma.organizationUser.findUnique({
    where: { clerk_user_id: CLERK_USER_ID },
  });

  let orgUserId: string;
  if (existingOrgUser) {
    if (existingOrgUser.organization_id === ORG_ID) {
      console.log(`  ✅ כבר קיים בארגון הדמו (${existingOrgUser.id}) - מעדכן role ל-owner...`);
      await prisma.organizationUser.update({
        where: { id: existingOrgUser.id },
        data: { role: 'owner', updated_at: new Date() },
      });
      orgUserId = existingOrgUser.id;
    } else {
      // User exists in another org — can't create duplicate.
      // Use the existing orgUser ID for lead assignment, and note this.
      console.log(`  ⚠️ היוזר קיים ב-organization_users אבל עבור ארגון אחר (${existingOrgUser.organization_id})`);
      console.log(`  ℹ️ clerk_user_id הוא unique constraint — לא ניתן ליצור רשומה נוספת`);
      console.log(`  ℹ️ המערכת משתמשת ב-super_admin bypass לגישה לארגון הדמו`);
      orgUserId = existingOrgUser.id;
    }
  } else {
    const created = await prisma.organizationUser.create({
      data: {
        organization_id: ORG_ID,
        clerk_user_id: CLERK_USER_ID,
        email: USER_EMAIL,
        full_name: USER_NAME,
        role: 'owner',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    orgUserId = created.id;
    console.log(`  ✅ נוצר: ${created.id}`);
  }

  // ── 2. nexus_users — הוספת היוזר כ-NexusUser ──
  console.log('\n🔹 2. nexus_users — הוספת היוזר...');

  const existingNexusUser = await prisma.nexusUser.findFirst({
    where: { organizationId: ORG_ID, email: USER_EMAIL },
  });

  let nexusUserId: string;
  if (existingNexusUser) {
    console.log(`  ✅ כבר קיים (${existingNexusUser.id}) - מעדכן role...`);
    await prisma.nexusUser.update({
      where: { id: existingNexusUser.id },
      data: { role: 'מנכ״ל', isSuperAdmin: true, name: USER_NAME },
    });
    nexusUserId = existingNexusUser.id;
  } else {
    const created = await prisma.nexusUser.create({
      data: {
        organizationId: ORG_ID,
        email: USER_EMAIL,
        name: USER_NAME,
        role: 'מנכ״ל',
        isSuperAdmin: true,
        online: true,
        capacity: 0,
      },
    });
    nexusUserId = created.id;
    console.log(`  ✅ נוצר: ${created.id}`);
  }

  // ── 3. profile — הוספת פרופיל ──
  console.log('\n🔹 3. profile — הוספת פרופיל...');

  const existingProfile = await prisma.profile.findFirst({
    where: { organizationId: ORG_ID, clerkUserId: CLERK_USER_ID },
  });

  if (existingProfile) {
    console.log(`  ✅ כבר קיים (${existingProfile.id})`);
  } else {
    const created = await prisma.profile.create({
      data: {
        organizationId: ORG_ID,
        clerkUserId: CLERK_USER_ID,
        email: USER_EMAIL,
        fullName: USER_NAME,
        role: 'owner',
        twoFactorEnabled: false,
        notificationPreferences: {},
        uiPreferences: { profileCompleted: true },
        socialProfile: {},
        billingInfo: {},
      },
    });
    console.log(`  ✅ נוצר: ${created.id}`);
  }

  // ── 4. NexusClient — יצירת לקוחות CRM ──
  console.log('\n🔹 4. NexusClient — יצירת לקוחות CRM...');

  const existingNexusClients = await prisma.nexusClient.findMany({
    where: { organizationId: ORG_ID },
  });

  if (existingNexusClients.length > 0) {
    console.log(`  ✅ כבר יש ${existingNexusClients.length} לקוחות`);
  } else {
    const nexusClients = [
      { name: 'יוסי כהן', companyName: 'סטודיו דיגיטל פלוס', package: 'premium', status: 'Active', contactPerson: 'יוסי כהן', email: 'yossi@digitalplus.co.il', phone: '0501234567' },
      { name: 'תמר אברהם', companyName: 'קפה שוק', package: 'basic', status: 'Active', contactPerson: 'תמר אברהם', email: 'tamar@cafeshuk.co.il', phone: '0529876543' },
      { name: 'מיכל לוי', companyName: 'סטייל ביוטי', package: 'premium', status: 'Active', contactPerson: 'מיכל לוי', email: 'michal@stylebeauty.co.il', phone: '0541112233' },
      { name: 'דוד מזרחי', companyName: 'טק סולושנס', package: 'enterprise', status: 'Active', contactPerson: 'דוד מזרחי', email: 'david@techsolutions.co.il', phone: '0504445566' },
      { name: 'רחל פרץ', companyName: 'נדל"ן גולד', package: 'basic', status: 'Active', contactPerson: 'רחל פרץ', email: 'rachel@realestate.co.il', phone: '0537778899' },
      { name: 'אברהם דהן', companyName: 'יועצי שלומי', package: 'premium', status: 'Onboarding', contactPerson: 'אברהם דהן', email: 'avi@shlomi.co.il', phone: '0509990011' },
      { name: 'נועה רוזנברג', companyName: 'מרכז רפואי אור', package: 'enterprise', status: 'Active', contactPerson: 'נועה רוזנברג', email: 'noa@orclinic.co.il', phone: '0522223344' },
      { name: 'עומר סויסה', companyName: 'גרפיקה פלוס', package: 'basic', status: 'Active', contactPerson: 'עומר סויסה', email: 'omer@graphicplus.co.il', phone: '0545556677' },
    ];

    for (const c of nexusClients) {
      await prisma.nexusClient.create({
        data: {
          organizationId: ORG_ID,
          name: c.name,
          companyName: c.companyName,
          contactPerson: c.contactPerson,
          email: c.email,
          phone: c.phone,
          package: c.package,
          status: c.status,
        },
      });
    }
    console.log(`  ✅ נוצרו ${nexusClients.length} לקוחות Nexus CRM`);
  }

  // ── 5. Assign some tasks to real user ──
  console.log('\n🔹 5. שיוך משימות ליוזר האמיתי...');

  const unassignedTasks = await prisma.nexusTask.findMany({
    where: { organizationId: ORG_ID, assigneeId: null },
    take: 5,
    select: { id: true, title: true },
  });

  if (unassignedTasks.length > 0) {
    await prisma.nexusTask.updateMany({
      where: { id: { in: unassignedTasks.map(t => t.id) } },
      data: { assigneeId: nexusUserId },
    });
    console.log(`  ✅ שויכו ${unassignedTasks.length} משימות ליוזר`);
  } else {
    // Reassign some tasks from demo users
    const someTasks = await prisma.nexusTask.findMany({
      where: { organizationId: ORG_ID },
      take: 10,
      select: { id: true },
    });
    if (someTasks.length > 0) {
      const toReassign = someTasks.slice(0, 5);
      await prisma.nexusTask.updateMany({
        where: { id: { in: toReassign.map(t => t.id) } },
        data: { assigneeId: nexusUserId },
      });
      console.log(`  ✅ שויכו ${toReassign.length} משימות ליוזר`);
    }
  }

  // ── 6. Assign some leads to real user ──
  console.log('\n🔹 6. שיוך לידים ליוזר האמיתי...');

  const leadsToAssign = await prisma.systemLead.findMany({
    where: { organizationId: ORG_ID, assignedAgentId: null },
    take: 10,
    select: { id: true },
  });

  if (leadsToAssign.length > 0) {
    // We need to use the organization_user ID for assignedAgentId
    await prisma.systemLead.updateMany({
      where: { id: { in: leadsToAssign.map(l => l.id) } },
      data: { assignedAgentId: orgUserId },
    });
    console.log(`  ✅ שויכו ${leadsToAssign.length} לידים ליוזר`);
  } else {
    console.log('  ℹ️ אין לידים ללא שיוך');
  }

  // ── 7. Verify Client module data ──
  console.log('\n🔹 7. בדיקת Client module...');

  const clientPortalUsers = await prisma.clientPortalUser.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true, email: true },
  });
  console.log(`  Client Portal Users: ${clientPortalUsers.length}`);

  const clientTasks = await prisma.clientTask.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true, title: true, status: true },
  });
  console.log(`  Client Tasks: ${clientTasks.length}`);

  const clientSessions = await prisma.clientSession.findMany({
    where: { organizationId: ORG_ID },
  });
  console.log(`  Client Sessions: ${clientSessions.length}`);

  // Create client sessions if missing
  if (clientSessions.length === 0) {
    console.log('  ⚠️ אין פגישות Client — יוצר...');

    const clientClients = await prisma.clientClient.findMany({
      where: { organizationId: ORG_ID },
      select: { id: true, fullName: true },
      take: 5,
    });

    const sessionTypes = ['פגישת אסטרטגיה', 'סקירה חודשית', 'בריף עיצוב', 'אונבורדינג', 'סגירת חודש'];

    for (let i = 0; i < Math.min(clientClients.length, sessionTypes.length); i++) {
      const daysOffset = Math.floor(Math.random() * 14) + 1;
      const startDate = new Date(Date.now() + daysOffset * 86400000);
      startDate.setHours(10 + Math.floor(Math.random() * 6), 0, 0, 0);
      const endDate = new Date(startDate.getTime() + 3600000);

      await prisma.clientSession.create({
        data: {
          organizationId: ORG_ID,
          clientId: clientClients[i].id,
          startAt: startDate,
          endAt: endDate,
          status: 'scheduled',
          sessionType: 'meeting',
          summary: `${sessionTypes[i]} — ${clientClients[i].fullName}`,
        },
      });
    }
    console.log(`  ✅ נוצרו ${Math.min(clientClients.length, sessionTypes.length)} פגישות`);
  }

  // ── FINAL VERIFICATION ──
  console.log('\n' + '='.repeat(60));
  console.log('📊 אימות סופי:\n');

  const verifyOrgUser = await prisma.organizationUser.findFirst({
    where: { organization_id: ORG_ID, clerk_user_id: CLERK_USER_ID },
    select: { id: true, role: true, email: true },
  });
  console.log(`  organization_user: ${verifyOrgUser ? `✅ ${verifyOrgUser.email} (${verifyOrgUser.role})` : '❌ חסר!'}`);

  const verifyNexusUser = await prisma.nexusUser.findFirst({
    where: { organizationId: ORG_ID, email: USER_EMAIL },
    select: { id: true, name: true, role: true },
  });
  console.log(`  nexus_user: ${verifyNexusUser ? `✅ ${verifyNexusUser.name} (${verifyNexusUser.role})` : '❌ חסר!'}`);

  const verifyProfile = await prisma.profile.findFirst({
    where: { organizationId: ORG_ID, clerkUserId: CLERK_USER_ID },
    select: { id: true, role: true },
  });
  console.log(`  profile: ${verifyProfile ? `✅ role=${verifyProfile.role}` : '❌ חסר!'}`);

  const verifyNexusClients = await prisma.nexusClient.count({ where: { organizationId: ORG_ID } });
  console.log(`  nexus_clients: ${verifyNexusClients > 0 ? `✅ ${verifyNexusClients}` : '❌ 0'}`);

  const verifyLeads = await prisma.systemLead.count({ where: { organizationId: ORG_ID } });
  console.log(`  system_leads: ${verifyLeads > 0 ? `✅ ${verifyLeads}` : '❌ 0'}`);

  const verifyTasks = await prisma.nexusTask.count({ where: { organizationId: ORG_ID } });
  console.log(`  nexus_tasks: ${verifyTasks > 0 ? `✅ ${verifyTasks}` : '❌ 0'}`);

  const myTasks = await prisma.nexusTask.count({
    where: { organizationId: ORG_ID, assigneeId: nexusUserId },
  });
  console.log(`  nexus_tasks assigned to me: ${myTasks > 0 ? `✅ ${myTasks}` : '❌ 0'}`);

  const myLeads = await prisma.systemLead.count({
    where: { organizationId: ORG_ID, assignedAgentId: orgUserId },
  });
  console.log(`  system_leads assigned to me: ${myLeads > 0 ? `✅ ${myLeads}` : '❌ 0'}`);

  const verifySessions = await prisma.clientSession.count({ where: { organizationId: ORG_ID } });
  console.log(`  client_sessions: ${verifySessions > 0 ? `✅ ${verifySessions}` : '❌ 0'}`);

  console.log('\n✅ תיקון שורשי מקיף הושלם!\n');

  await prisma.$disconnect();
}

comprehensiveFix().catch((e) => {
  console.error('❌ שגיאה:', e);
  prisma.$disconnect();
  process.exit(1);
});
