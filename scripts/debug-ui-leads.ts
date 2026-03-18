import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ORG_SLUG = 'misrad-ai-demo-il';
const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';
const CLERK_ID = 'user_39UkuSmIkk20b1MuAahuYqWHKoe';

async function debugUILeads() {
  console.log('🔍 בדיקה מעמיקה למה הלידים לא מופיעים ב-UI\n');
  
  // 1. Check organization exists
  console.log('━━━ שלב 1: בדיקת ארגון ━━━');
  const org = await prisma.organization.findUnique({
    where: { id: ORG_ID },
    select: { id: true, slug: true, name: true }
  });
  
  if (!org) {
    console.log('❌ הארגון לא נמצא!');
    return;
  }
  console.log(`✅ ארגון: ${org.name} (${org.slug})`);
  
  // 2. Check user is connected
  console.log('\n━━━ שלב 2: בדיקת משתמש ━━━');
  const orgUser = await prisma.organizationUser.findUnique({
    where: { clerk_user_id: CLERK_ID },
    select: { 
      id: true, 
      role: true, 
      organization_id: true,
      clerk_user_id: true
    }
  });
  
  if (!orgUser) {
    console.log('❌ המשתמש לא נמצא במערכת!');
    return;
  }
  
  if (orgUser.organization_id !== ORG_ID) {
    console.log(`❌ המשתמש שייך לארגון אחר: ${orgUser.organization_id}`);
    console.log(`   צריך להיות: ${ORG_ID}`);
    return;
  }
  
  console.log(`✅ משתמש מחובר לארגון הנכון`);
  console.log(`   Role: ${orgUser.role}`);
  
  // 3. Count leads
  console.log('\n━━━ שלב 3: ספירת לידים ━━━');
  const totalLeads = await prisma.systemLead.count({
    where: { organizationId: ORG_ID }
  });
  console.log(`📊 סה"כ לידים: ${totalLeads}`);
  
  if (totalLeads === 0) {
    console.log('❌ אין לידים כלל!');
    return;
  }
  
  // 4. Check lead statuses
  console.log('\n━━━ שלב 4: בדיקת סטטוסים ━━━');
  const leads = await prisma.systemLead.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true, name: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  const statuses = new Set(leads.map(l => l.status));
  console.log('סטטוסים בשימוש:', Array.from(statuses));
  
  console.log('\n10 לידים אחרונים:');
  leads.forEach((lead, i) => {
    console.log(`  ${i+1}. ${lead.name} - ${lead.status}`);
  });
  
  // 5. Simulate getSystemLeadsPage query
  console.log('\n━━━ שלב 5: סימולציה של query מה-UI ━━━');
  
  const role = String(orgUser.role || '').toLowerCase();
  const userRole = ['super_admin', 'admin', 'owner'].includes(role) ? 'admin' : 'agent';
  
  const agentFilter = userRole === 'agent' && orgUser.id
    ? { OR: [{ assignedAgentId: orgUser.id }, { assignedAgentId: null }] }
    : {};
  
  const where = {
    organizationId: ORG_ID,
    AND: Object.keys(agentFilter).length > 0 ? [agentFilter] : []
  };
  
  console.log('WHERE clause:', JSON.stringify(where, null, 2));
  
  const queryResult = await prisma.systemLead.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 200,
    select: {
      id: true,
      name: true,
      status: true,
      phone: true,
      email: true,
      company: true,
      createdAt: true
    }
  });
  
  console.log(`\n📊 Query החזיר: ${queryResult.length} לידים`);
  
  if (queryResult.length === 0) {
    console.log('❌ ה-query לא מחזיר שום דבר!');
    console.log('   זו הבעיה! צריך לבדוק למה...');
  } else {
    console.log('✅ ה-query עובד! הבעיה היא ב-UI/cache');
    console.log('\n5 לידים ראשונים שחזרו:');
    queryResult.slice(0, 5).forEach((lead, i) => {
      console.log(`  ${i+1}. ${lead.name} (${lead.status})`);
    });
  }
  
  // 6. Check if there are any filters/issues
  console.log('\n━━━ שלב 6: בדיקות נוספות ━━━');
  
  const leadsWithActivities = await prisma.systemLead.findMany({
    where: { organizationId: ORG_ID },
    select: {
      id: true,
      name: true,
      _count: {
        select: { activities: true }
      }
    },
    take: 5
  });
  
  console.log('לידים עם פעילויות:');
  leadsWithActivities.forEach(lead => {
    console.log(`  ${lead.name}: ${lead._count.activities} פעילויות`);
  });
  
  await prisma.$disconnect();
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('סיכום:');
  console.log(`✅ ארגון קיים: ${org.name}`);
  console.log(`✅ משתמש מחובר: ${orgUser.clerk_user_id}`);
  console.log(`✅ סה"כ לידים: ${totalLeads}`);
  console.log(`${queryResult.length > 0 ? '✅' : '❌'} Query מחזיר: ${queryResult.length} לידים`);
  
  if (queryResult.length === 0 && totalLeads > 0) {
    console.log('\n🔥 הבעיה: הלידים קיימים אבל ה-query לא מחזיר אותם!');
    console.log('   סביר שהבעיה היא ב-RBAC filter או tenant isolation');
  } else if (queryResult.length > 0) {
    console.log('\n🔥 הבעיה: ה-query עובד! הבעיה היא ב-UI או cache של הדפדפן');
    console.log('   פתרון: Hard refresh (Ctrl+Shift+R) או Incognito mode');
  }
}

debugUILeads().catch(console.error);
