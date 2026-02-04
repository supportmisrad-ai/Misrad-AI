'use server';

import type { MemberType, TeamMember, TeamMemberRole } from '@/types/social';
import prisma from '@/lib/prisma';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getUnknownErrorMessage(error: unknown): string {
  if (!error) return '';
  if (error instanceof Error) return error.message;
  const obj = asObject(error);
  const msg = obj?.message;
  return typeof msg === 'string' ? msg : '';
}

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

    const rows = (await prisma.social_team_members.findMany({
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
    })) as unknown as TeamMemberRow[];

    const teamMembers: TeamMember[] = rows.map((member) => {
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

