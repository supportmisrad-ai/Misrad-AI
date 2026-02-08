'use server';

import type { MemberType, TeamMember, TeamMemberRole } from '@/types/social';
import prisma from '@/lib/prisma';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';


import { asObject, getErrorMessage as getUnknownErrorMessage } from '@/lib/shared/unknown';

type TeamMemberRow = {
  id: string;
  user_id: string | null;
  organization_id: string;
  name: string;
  role: string | null;
  member_type: string | null;
  avatar: string;
  active_tasks_count: number | null;
  capacity_score: number | null;
  hourly_rate: string | number | null;
  monthly_salary: string | number | null;
  social_team_member_clients?: Array<{ client_id: string }> | null;
};

function toTeamMemberRow(value: unknown): TeamMemberRow {
  const obj = asObject(value) ?? {};
  const clientsRaw = obj.social_team_member_clients;
  const social_team_member_clients = Array.isArray(clientsRaw)
    ? clientsRaw
        .map((c) => {
          const cObj = asObject(c) ?? {};
          const clientId = cObj.client_id;
          return clientId == null ? null : { client_id: String(clientId) };
        })
        .filter((c): c is { client_id: string } => Boolean(c))
    : null;

  const hourlyRateRaw = obj.hourly_rate;
  const monthlySalaryRaw = obj.monthly_salary;

  return {
    id: String(obj.id ?? ''),
    user_id: obj.user_id == null ? null : String(obj.user_id),
    organization_id: String(obj.organization_id ?? ''),
    name: String(obj.name ?? ''),
    role: obj.role == null ? null : String(obj.role),
    member_type: obj.member_type == null ? null : String(obj.member_type),
    avatar: String(obj.avatar ?? ''),
    active_tasks_count: obj.active_tasks_count == null ? null : Number(obj.active_tasks_count),
    capacity_score: obj.capacity_score == null ? null : Number(obj.capacity_score),
    hourly_rate:
      hourlyRateRaw == null || typeof hourlyRateRaw === 'string' || typeof hourlyRateRaw === 'number'
        ? (hourlyRateRaw as string | number | null)
        : String(hourlyRateRaw),
    monthly_salary:
      monthlySalaryRaw == null || typeof monthlySalaryRaw === 'string' || typeof monthlySalaryRaw === 'number'
        ? (monthlySalaryRaw as string | number | null)
        : String(monthlySalaryRaw),
    social_team_member_clients,
  };
}

function isTeamMemberRole(v: unknown): v is TeamMemberRole {
  return v === 'account_manager' || v === 'content_creator' || v === 'designer';
}

function isMemberType(v: unknown): v is MemberType {
  return v === 'employee' || v === 'freelancer';
}

/**
 * Server Action: Get all team members
 * Filters by organization - only shows team members from user's organization
 * Super admin sees all team members
 */
export async function getTeamMembers(orgSlug: string): Promise<{ success: boolean; data?: TeamMember[]; error?: string }> {
  try {
    let organizationId: string;
    try {
      const workspace = await requireWorkspaceAccessByOrgSlugApi(String(orgSlug || '').trim());
      organizationId = String(workspace?.id || '').trim();
    } catch {
      return { success: false, error: 'Forbidden' };
    }

    if (!organizationId) {
      return { success: false, error: 'Missing organizationId' };
    }

    const rows = (await prisma.teamMember.findMany({
      where: { organization_id: String(organizationId) },
      select: {
        id: true,
        user_id: true,
        organization_id: true,
        name: true,
        role: true,
        member_type: true,
        avatar: true,
        active_tasks_count: true,
        capacity_score: true,
        hourly_rate: true,
        monthly_salary: true,
        created_at: true,
        social_team_member_clients: { select: { client_id: true } },
      },
      orderBy: { created_at: 'desc' },
    }));

    const rowsNormalized: TeamMemberRow[] = (Array.isArray(rows) ? rows : []).map(toTeamMemberRow);

    const teamMembers: TeamMember[] = rowsNormalized.map((member) => {
      const roleRaw = member.role ?? null;
      const memberTypeRaw = member.member_type ?? null;

      return {
        id: member.id,
        userId: member.user_id ?? undefined,
        organizationId: member.organization_id,
        name: member.name,
        role: isTeamMemberRole(roleRaw) ? roleRaw : 'account_manager',
        memberType: isMemberType(memberTypeRaw) ? memberTypeRaw : 'employee',
        avatar: member.avatar,
        assignedClients: (member.social_team_member_clients || []).map((tmc) => tmc.client_id),
        activeTasksCount: member.active_tasks_count || 0,
        capacityScore: member.capacity_score || 0,
        hourlyRate: member.hourly_rate ? Number(member.hourly_rate) : undefined,
        monthlySalary: member.monthly_salary ? Number(member.monthly_salary) : undefined,
      };
    });

    return {
      success: true,
      data: teamMembers,
    };
  } catch (error: unknown) {
    console.error('Error in getTeamMembers:', error);
    return {
      success: false,
      error: getUnknownErrorMessage(error) || 'שגיאה בטעינת חברי צוות',
    };
  }
}

