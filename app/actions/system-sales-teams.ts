'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { requireOrganizationId } from '@/lib/tenant-isolation';

export type SalesTeamDTO = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  target_monthly: number;
  is_active: boolean;
  created_at: string;
  members: SalesTeamMemberDTO[];
};

export type SalesTeamMemberDTO = {
  id: string;
  team_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  role: string;
  target_monthly: number;
  is_active: boolean;
};

export async function getSalesTeamsAction(orgSlug: string): Promise<{ teams: SalesTeamDTO[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    const organizationId = requireOrganizationId('getSalesTeamsAction', workspace.id);

    const teams = await (prisma as any).misradSalesTeam.findMany({
      where: { organization_id: organizationId },
      orderBy: { created_at: 'desc' },
      include: {
        members: {
          where: { is_active: true },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    return {
      teams: (teams as any[]).map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        color: t.color ?? '#6366f1',
        target_monthly: t.target_monthly ?? 0,
        is_active: t.is_active,
        created_at: t.created_at.toISOString(),
        members: (t.members as any[]).map((m: any) => ({
          id: m.id,
          team_id: m.team_id,
          name: m.name,
          email: m.email,
          phone: m.phone,
          avatar: m.avatar,
          role: m.role,
          target_monthly: m.target_monthly ?? 0,
          is_active: m.is_active,
        })),
      })),
    };
  } catch (err) {
    console.error('[getSalesTeamsAction]', err);
    return { teams: [], error: String(err) };
  }
}

export async function createSalesTeamAction(orgSlug: string, data: {
  name: string;
  description?: string;
  color?: string;
  target_monthly?: number;
}): Promise<{ id?: string; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    const organizationId = requireOrganizationId('createSalesTeamAction', workspace.id);

    const team = await (prisma as any).misradSalesTeam.create({
      data: {
        organization_id: organizationId,
        name: data.name,
        description: data.description || null,
        color: data.color || '#6366f1',
        target_monthly: data.target_monthly || 0,
      },
    });

    revalidatePath(`/w/${orgSlug}/system/teams`, 'page');
    return { id: team.id };
  } catch (err) {
    console.error('[createSalesTeamAction]', err);
    return { error: String(err) };
  }
}

export async function addTeamMemberAction(orgSlug: string, data: {
  team_id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  target_monthly?: number;
}): Promise<{ id?: string; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    const organizationId = requireOrganizationId('addTeamMemberAction', workspace.id);

    const member = await (prisma as any).misradSalesTeamMember.create({
      data: {
        organization_id: organizationId,
        team_id: data.team_id,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        role: (data.role as any) || 'MEMBER',
        target_monthly: data.target_monthly || 0,
      },
    });

    revalidatePath(`/w/${orgSlug}/system/teams`, 'page');
    return { id: member.id };
  } catch (err) {
    console.error('[addTeamMemberAction]', err);
    return { error: String(err) };
  }
}

export async function deleteTeamMemberAction(orgSlug: string, memberId: string): Promise<{ error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    requireOrganizationId('deleteTeamMemberAction', workspace.id);
    await (prisma as any).misradSalesTeamMember.delete({ where: { id: memberId } });
    revalidatePath(`/w/${orgSlug}/system/teams`, 'page');
    return {};
  } catch (err) {
    console.error('[deleteTeamMemberAction]', err);
    return { error: String(err) };
  }
}

export async function deleteSalesTeamAction(orgSlug: string, teamId: string): Promise<{ error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    requireOrganizationId('deleteSalesTeamAction', workspace.id);
    await (prisma as any).misradSalesTeam.delete({ where: { id: teamId } });
    revalidatePath(`/w/${orgSlug}/system/teams`, 'page');
    return {};
  } catch (err) {
    console.error('[deleteSalesTeamAction]', err);
    return { error: String(err) };
  }
}
