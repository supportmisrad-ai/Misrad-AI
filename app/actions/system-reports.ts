'use server';

import prisma from '@/lib/prisma';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { queryRawOrgScoped } from '@/lib/prisma';

import { asObject } from '@/lib/shared/unknown';
function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((t) => String(t)).filter(Boolean);
  const obj = asObject(value);
  const v = obj?.value;
  if (Array.isArray(v)) return v.map((t) => String(t)).filter(Boolean);
  return [];
}

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

function toSystemCampaignDto(row: unknown): SystemCampaignDTO {
  const obj = asObject(row) ?? {};
  return {
    id: String(obj.id ?? ''),
    name: String(obj.name ?? ''),
    platform: String(obj.platform ?? ''),
    status: String(obj.status ?? ''),
    budget: Number(obj.budget ?? 0),
    spent: Number(obj.spent ?? 0),
    leads: Number(obj.leads ?? 0),
    cpl: Number(obj.cpl ?? 0),
    roas: Number(obj.roas ?? 0),
    impressions: Number(obj.impressions ?? 0),
    created_at: new Date(String(obj.createdAt ?? obj.created_at ?? new Date().toISOString())).toISOString(),
  };
}

async function listSystemTasksInOrganization(params: { organizationId: string; take: number }): Promise<unknown[]> {
  const safeTake = Math.max(1, Math.min(500, Math.floor(params.take)));

  const rows = await queryRawOrgScoped<unknown[]>(prisma, {
    organizationId: params.organizationId,
    reason: 'system_reports_list_system_tasks',
    query: `
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
      WHERE p.organization_id = $1::uuid
      ORDER BY t.due_date ASC, t.created_at DESC
      LIMIT $2::int
    `,
    values: [params.organizationId, safeTake],
  });

  return Array.isArray(rows) ? rows : [];
}

function toSystemTaskDto(row: unknown): SystemTaskDTO {
  const obj = asObject(row) ?? {};
  const normalizedTags = normalizeTags(obj.tags);

  return {
    id: String(obj.id ?? ''),
    title: String(obj.title ?? ''),
    description: obj.description == null ? null : String(obj.description),
    assignee_id: String(obj.assignee_id ?? ''),
    due_date: new Date(String(obj.due_date ?? new Date().toISOString())).toISOString(),
    priority: String(obj.priority ?? ''),
    status: String(obj.status ?? ''),
    tags: normalizedTags,
    created_at: new Date(String(obj.created_at ?? new Date().toISOString())).toISOString(),
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
