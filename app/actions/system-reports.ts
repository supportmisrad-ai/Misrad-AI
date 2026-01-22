'use server';

import prisma from '@/lib/prisma';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';

export type SystemCampaignDTO = {
  id: string;
  name: string;
  platform: string;
  status: string;
  budget: number;
  spent: number;
  leads: number;
  cpl: number;
  roas: number;
  impressions: number;
  created_at: string;
};

export type SystemTaskDTO = {
  id: string;
  title: string;
  description: string | null;
  assignee_id: string;
  due_date: string;
  priority: string;
  status: string;
  tags: string[];
  created_at: string;
};

function toSystemCampaignDto(row: any): SystemCampaignDTO {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    platform: String(row.platform || ''),
    status: String(row.status || ''),
    budget: Number(row.budget ?? 0),
    spent: Number(row.spent ?? 0),
    leads: Number(row.leads ?? 0),
    cpl: Number(row.cpl ?? 0),
    roas: Number(row.roas ?? 0),
    impressions: Number(row.impressions ?? 0),
    created_at: new Date(row.createdAt || row.created_at || new Date()).toISOString(),
  };
}

function toSystemTaskDto(row: any): SystemTaskDTO {
  const tags = Array.isArray(row.tags) ? row.tags : Array.isArray(row.tags?.value) ? row.tags.value : row.tags;
  const normalizedTags = Array.isArray(tags) ? tags.map((t: any) => String(t)).filter(Boolean) : [];

  return {
    id: String(row.id),
    title: String(row.title || ''),
    description: row.description == null ? null : String(row.description),
    assignee_id: String(row.assigneeId || row.assignee_id || ''),
    due_date: new Date(row.dueDate || row.due_date || new Date()).toISOString(),
    priority: String(row.priority || ''),
    status: String(row.status || ''),
    tags: normalizedTags,
    created_at: new Date(row.createdAt || row.created_at || new Date()).toISOString(),
  };
}

export async function getSystemCampaigns(params: {
  orgSlug: string;
  take?: number;
}): Promise<SystemCampaignDTO[]> {
  await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  throw new Error('דוח קמפיינים אינו זמין כרגע (SystemCampaign לא מופרד לפי ארגון).');
}

export async function getSystemTasks(params: {
  orgSlug: string;
  take?: number;
}): Promise<SystemTaskDTO[]> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

  const assignees = await prisma.profile.findMany({
    where: { organizationId: workspace.id },
    select: { id: true },
    take: 500,
  });

  const assigneeIds = assignees.map((a) => String(a.id)).filter(Boolean);
  if (!assigneeIds.length) return [];

  const rows = await prisma.systemTask.findMany({
    where: { assigneeId: { in: assigneeIds } },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    take: Math.max(1, Math.min(500, Math.floor(params.take ?? 200))),
  });
  return rows.map(toSystemTaskDto);
}
