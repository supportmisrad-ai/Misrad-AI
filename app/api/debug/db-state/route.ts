/**
 * Debug endpoint — בדיקת מצב DB ומחזיר JSON עם כל הנתונים
 * גישה: GET /api/debug/db-state?orgId=ORG_ID
 */
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ORG_ID = '444a2284-c5e4-48a8-8608-ae890dfb5e62';
const USER_EMAIL = 'itsikdahan1@gmail.com';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orgId = searchParams.get('orgId') || ORG_ID;

  try {
    const results: Record<string, any> = {};

    // 1. Organization check
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, slug: true, has_system: true, has_nexus: true },
    });
    results.organization = org;

    // 2. Nexus user for this org
    const nexusUser = await prisma.nexusUser.findFirst({
      where: { organizationId: orgId, email: USER_EMAIL },
      select: { id: true, name: true, role: true },
    });
    results.nexusUser = nexusUser;

    // 3. Nexus tasks
    const nexusTasks = await prisma.nexusTask.count({
      where: { organizationId: orgId },
    });
    results.nexusTasks = nexusTasks;

    // 4. Nexus clients
    const nexusClients = await prisma.nexusClient.count({
      where: { organizationId: orgId },
    });
    results.nexusClients = nexusClients;

    // 5. System leads
    const systemLeads = await prisma.systemLead.count({
      where: { organizationId: orgId },
    });
    results.systemLeads = systemLeads;

    // 6. System support tickets
    const supportTickets = await prisma.systemSupportTicket.count({
      where: { organizationId: orgId },
    });
    results.supportTickets = supportTickets;

    // 7. Misrad sales teams
    const salesTeams = await prisma.misradSalesTeam.count({
      where: { organization_id: orgId },
    });
    results.salesTeams = salesTeams;

    // 8. Misrad field teams
    const fieldTeams = await prisma.misradFieldTeam.count({
      where: { organization_id: orgId },
    });
    results.fieldTeams = fieldTeams;

    // 9. Nexus team events
    const teamEvents = await prisma.nexusTeamEvent.count({
      where: { organizationId: orgId },
    });
    results.teamEvents = teamEvents;

    // 10. Client clients
    const clientClients = await prisma.clientClient.count({
      where: { organizationId: orgId },
    });
    results.clientClients = clientClients;

    // 11. Client sessions
    const clientSessions = await prisma.clientSession.count({
      where: { organizationId: orgId },
    });
    results.clientSessions = clientSessions;

    // 12. Profile for user in org
    const profile = await prisma.profile.findFirst({
      where: { organizationId: orgId, email: USER_EMAIL },
      select: { id: true, role: true, isSuperAdmin: true },
    });
    results.profile = profile;

    // 13. Organization user (by email)
    const orgUser = await prisma.organizationUser.findFirst({
      where: { email: USER_EMAIL },
      select: { id: true, role: true, organization_id: true },
    });
    results.organizationUser = orgUser;

    return NextResponse.json({
      success: true,
      orgId,
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      results,
    });
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : String(e);
    return NextResponse.json({
      success: false,
      error,
      orgId,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
