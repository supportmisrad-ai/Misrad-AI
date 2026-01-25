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

async function listSystemTasksInOrganization(params: { organizationId: string; take: number }): Promise<any[]> {
  const safeTake = Math.max(1, Math.min(500, Math.floor(params.take)));

  const rows = await prisma.$queryRaw<any[]>`
    SELECT
      t.id,
      t.title,
      t.description,
      t.assignee_id,
      t.due_date,
      t.priority,
      t.status,
      t.tags,
      t.created_at,
      t.updated_at
    FROM system_tasks t
    JOIN profiles p ON p.id = t.assignee_id
    WHERE p.organization_id = ${params.organizationId}::uuid
    ORDER BY t.due_date ASC, t.created_at DESC
    LIMIT ${safeTake}
  `;

  return Array.isArray(rows) ? rows : [];
}

function toSystemTaskDto(row: any): SystemTaskDTO {
  const tags = Array.isArray(row.tags) ? row.tags : Array.isArray(row.tags?.value) ? row.tags.value : row.tags;
  const normalizedTags = Array.isArray(tags) ? tags.map((t: any) => String(t)).filter(Boolean) : [];

  return {
    id: String(row.id),
    title: String(row.title || ''),
    description: row.description == null ? null : String(row.description),
    assignee_id: String(row.assignee_id || ''),
    due_date: new Date(row.due_date || new Date()).toISOString(),
    priority: String(row.priority || ''),
    status: String(row.status || ''),
    tags: normalizedTags,
    created_at: new Date(row.created_at || new Date()).toISOString(),
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

  const rows = await listSystemTasksInOrganization({
    organizationId: workspace.id,
    take: Math.max(1, Math.min(500, Math.floor(params.take ?? 200))),
  });
  return rows.map(toSystemTaskDto);
}
