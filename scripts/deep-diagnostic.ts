/**
 * אבחון עמוק: בדיקת כל הנתונים של ארגון הדגמה בכל המודולים
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';

async function deepDiagnostic() {
  console.log('🔬 אבחון עמוק — ארגון הדגמה\n');
  console.log('='.repeat(60));

  // ── ORG INFO ──
  const org = await prisma.organization.findUnique({
    where: { id: ORG_ID },
    select: {
      id: true, name: true, slug: true,
      has_nexus: true, has_system: true, has_client: true, has_finance: true, has_social: true, has_operations: true,
      owner_id: true, client_id: true,
    }
  });
  console.log('\n📌 ארגון:', JSON.stringify(org, null, 2));

  // ── SYSTEM MODULE ──
  console.log('\n' + '='.repeat(60));
  console.log('📊 SYSTEM MODULE DATA:\n');

  const systemLeads = await prisma.systemLead.findMany({ where: { organizationId: ORG_ID }, select: { id: true, name: true, status: true, createdAt: true } });
  console.log(`  System Leads: ${systemLeads.length}`);
  if (systemLeads.length > 0) {
    systemLeads.slice(0, 3).forEach(l => console.log(`    - ${l.name} (${l.status}) created: ${l.createdAt}`));
  }

  const pipelineStages = await prisma.systemPipelineStage.findMany({ where: { organizationId: ORG_ID } });
  console.log(`  Pipeline Stages: ${pipelineStages.length}`);

  const supportTickets = await prisma.systemSupportTicket.findMany({ where: { organizationId: ORG_ID } });
  console.log(`  Support Tickets: ${supportTickets.length}`);

  const leadActivities = await prisma.systemLeadActivity.findMany({ where: { organizationId: ORG_ID } });
  console.log(`  Lead Activities: ${leadActivities.length}`);

  const salesTeams = await prisma.misradSalesTeam.findMany({ where: { organization_id: ORG_ID } });
  console.log(`  Sales Teams: ${salesTeams.length}`);

  const fieldTeams = await prisma.misradFieldTeam.findMany({ where: { organization_id: ORG_ID } });
  console.log(`  Field Teams: ${fieldTeams.length}`);

  // ── NEXUS MODULE ──
  console.log('\n' + '='.repeat(60));
  console.log('📊 NEXUS MODULE DATA:\n');

  const nexusUsers = await prisma.nexusUser.findMany({ where: { organizationId: ORG_ID }, select: { id: true, name: true, email: true, role: true } });
  console.log(`  Nexus Users: ${nexusUsers.length}`);
  nexusUsers.slice(0, 3).forEach(u => console.log(`    - ${u.name} (${u.role}) ${u.email}`));

  const nexusTasks = await prisma.nexusTask.findMany({ where: { organizationId: ORG_ID }, select: { id: true, title: true, status: true, createdAt: true } });
  console.log(`  Nexus Tasks: ${nexusTasks.length}`);
  if (nexusTasks.length > 0) {
    nexusTasks.slice(0, 3).forEach(t => console.log(`    - ${t.title} (${t.status}) created: ${t.createdAt}`));
  }

  const nexusClients = await prisma.nexusClient.findMany({ where: { organizationId: ORG_ID }, select: { id: true, name: true } });
  console.log(`  Nexus Clients: ${nexusClients.length}`);

  const teamEvents = await prisma.nexusTeamEvent.findMany({ where: { organizationId: ORG_ID } });
  console.log(`  Team Events: ${teamEvents.length}`);

  const timeEntries = await prisma.nexusTimeEntry.findMany({ where: { organizationId: ORG_ID } });
  console.log(`  Time Entries: ${timeEntries.length}`);

  // ── CLIENT MODULE ──
  console.log('\n' + '='.repeat(60));
  console.log('📊 CLIENT MODULE DATA:\n');

  const clientClients = await prisma.clientClient.findMany({ where: { organizationId: ORG_ID }, select: { id: true, fullName: true, status: true } });
  console.log(`  Client Clients: ${clientClients.length}`);
  clientClients.slice(0, 3).forEach(c => console.log(`    - ${c.fullName} (${c.status})`));

  const clientTasks = await prisma.clientTask.findMany({ where: { organizationId: ORG_ID }, select: { id: true, title: true, status: true } });
  console.log(`  Client Tasks: ${clientTasks.length}`);

  const clientPortalUsers = await prisma.clientPortalUser.findMany({ where: { organizationId: ORG_ID } });
  console.log(`  Client Portal Users: ${clientPortalUsers.length}`);

  // ── FINANCE MODULE ──
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINANCE / OPERATIONS DATA:\n');

  const invoices = await prisma.misradInvoice.findMany({ where: { organization_id: ORG_ID } });
  console.log(`  Invoices: ${invoices.length}`);

  const clients = await prisma.misradClient.findMany({ where: { organizationId: ORG_ID } });
  console.log(`  Misrad Clients: ${clients.length}`);

  // ── SOCIAL MODULE ──
  const socialPosts = await prisma.socialPost.findMany({ where: { organizationId: ORG_ID } });
  console.log(`  Social Posts: ${socialPosts.length}`);

  // ── OPERATIONS MODULE ──
  let opsWorkOrders = 0;
  try {
    const wo = await prisma.operationsWorkOrder.findMany({ where: { organizationId: ORG_ID } });
    opsWorkOrders = wo.length;
  } catch { /* model might not exist */ }
  console.log(`  Operations Work Orders: ${opsWorkOrders}`);

  // ── ATTENDANCE ──
  let attendance = 0;
  try {
    const att = await (prisma as any).nexusAttendanceRecord?.findMany?.({ where: { organizationId: ORG_ID } });
    attendance = att?.length || 0;
  } catch { /* */ }
  console.log(`  Attendance Records: ${attendance}`);

  // ── KEY QUESTION: tenant isolation ──
  console.log('\n' + '='.repeat(60));
  console.log('🔑 TENANT ISOLATION CHECK:\n');
  
  // Check if clerk_org_id matches what Clerk sends
  console.log(`  org.id (UUID): ${ORG_ID}`);
  console.log(`  org.slug: ${org?.slug}`);

  // Check organization_users for this org
  const orgUsers = await prisma.organizationUser.findMany({
    where: { organization_id: ORG_ID },
    select: { id: true, email: true, role: true, clerk_user_id: true }
  });
  console.log(`\n  Organization Users: ${orgUsers.length}`);
  orgUsers.forEach(u => console.log(`    - ${u.email} (${u.role}) clerk: ${u.clerk_user_id}`));

  console.log('\n' + '='.repeat(60));
  console.log('✅ אבחון הושלם\n');

  await prisma.$disconnect();
}

deepDiagnostic().catch(e => { console.error(e); prisma.$disconnect(); });
