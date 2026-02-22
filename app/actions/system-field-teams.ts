'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { requireOrganizationId } from '@/lib/tenant-isolation';

export type FieldTeamDTO = {
  id: string;
  name: string;
  area: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  agents: FieldAgentDTO[];
};

export type FieldAgentDTO = {
  id: string;
  team_id: string | null;
  name: string;
  phone: string | null;
  avatar: string | null;
  area: string | null;
  status: string;
  lat: number | null;
  lng: number | null;
  is_active: boolean;
  visits_today: number;
  visits_remaining: number;
};

export async function getFieldTeamsAction(orgSlug: string): Promise<{ teams: FieldTeamDTO[]; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    const organizationId = requireOrganizationId('getFieldTeamsAction', workspace.id);

    const teams = await (prisma as any).misradFieldTeam.findMany({
      where: { organization_id: organizationId },
      orderBy: { created_at: 'desc' },
      include: {
        agents: {
          where: { is_active: true },
          orderBy: { created_at: 'asc' },
          include: {
            visits: {
              where: {
                scheduled_at: {
                  gte: new Date(new Date().setHours(0, 0, 0, 0)),
                  lt: new Date(new Date().setHours(23, 59, 59, 999)),
                },
              },
            },
          },
        },
      },
    });

    return {
      teams: (teams as any[]).map((t: any) => ({
        id: t.id,
        name: t.name,
        area: t.area,
        color: t.color ?? '#f43f5e',
        is_active: t.is_active,
        created_at: t.created_at.toISOString(),
        agents: (t.agents as any[]).map((a: any) => ({
          id: a.id,
          team_id: a.team_id,
          name: a.name,
          phone: a.phone,
          avatar: a.avatar,
          area: a.area,
          status: a.status,
          lat: a.lat,
          lng: a.lng,
          is_active: a.is_active,
          visits_today: (a.visits as any[]).filter((v: any) => v.status === 'COMPLETED').length,
          visits_remaining: (a.visits as any[]).filter((v: any) => v.status === 'UPCOMING' || v.status === 'CURRENT').length,
        })),
      })),
    };
  } catch (err) {
    console.error('[getFieldTeamsAction]', err);
    return { teams: [], error: String(err) };
  }
}

export async function createFieldTeamAction(orgSlug: string, data: {
  name: string;
  area?: string;
  color?: string;
}): Promise<{ id?: string; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    const organizationId = requireOrganizationId('createFieldTeamAction', workspace.id);

    const team = await (prisma as any).misradFieldTeam.create({
      data: {
        organization_id: organizationId,
        name: data.name,
        area: data.area || null,
        color: data.color || '#f43f5e',
      },
    });

    revalidatePath(`/w/${orgSlug}/system/field_map`, 'page');
    return { id: team.id };
  } catch (err) {
    console.error('[createFieldTeamAction]', err);
    return { error: String(err) };
  }
}

export async function addFieldAgentAction(orgSlug: string, data: {
  team_id: string;
  name: string;
  phone?: string;
  area?: string;
}): Promise<{ id?: string; error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    const organizationId = requireOrganizationId('addFieldAgentAction', workspace.id);

    const agent = await (prisma as any).misradFieldAgent.create({
      data: {
        organization_id: organizationId,
        team_id: data.team_id,
        name: data.name,
        phone: data.phone || null,
        area: data.area || null,
      },
    });

    revalidatePath(`/w/${orgSlug}/system/field_map`, 'page');
    return { id: agent.id };
  } catch (err) {
    console.error('[addFieldAgentAction]', err);
    return { error: String(err) };
  }
}

export async function deleteFieldTeamAction(orgSlug: string, teamId: string): Promise<{ error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    requireOrganizationId('deleteFieldTeamAction', workspace.id);
    await (prisma as any).misradFieldTeam.delete({ where: { id: teamId } });
    revalidatePath(`/w/${orgSlug}/system/field_map`, 'page');
    return {};
  } catch (err) {
    console.error('[deleteFieldTeamAction]', err);
    return { error: String(err) };
  }
}

export async function deleteFieldAgentAction(orgSlug: string, agentId: string): Promise<{ error?: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    requireOrganizationId('deleteFieldAgentAction', workspace.id);
    await (prisma as any).misradFieldAgent.delete({ where: { id: agentId } });
    revalidatePath(`/w/${orgSlug}/system/field_map`, 'page');
    return {};
  } catch (err) {
    console.error('[deleteFieldAgentAction]', err);
    return { error: String(err) };
  }
}
