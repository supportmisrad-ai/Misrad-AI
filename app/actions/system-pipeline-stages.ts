'use server';

import prisma from '@/lib/prisma';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';

export type SystemPipelineStageDTO = {
  id: string;
  key: string;
  label: string;
  color: string | null;
  accent: string | null;
  order: number;
  isActive: boolean;
};

const DEFAULT_STAGES: Array<{
  key: string;
  label: string;
  color: string;
  accent: string;
  order: number;
}> = [
  { key: 'incoming', label: 'נכנס', color: 'border-slate-200', accent: 'bg-slate-400', order: 10 },
  { key: 'contacted', label: 'דיברנו', color: 'border-slate-200', accent: 'bg-slate-500', order: 20 },
  { key: 'meeting', label: 'יש פגישה', color: 'border-indigo-100', accent: 'bg-indigo-600', order: 30 },
  { key: 'proposal', label: 'קיבל הצעה', color: 'border-indigo-200', accent: 'bg-indigo-800', order: 40 },
  { key: 'negotiation', label: 'במו"מ', color: 'border-amber-100', accent: 'bg-amber-600', order: 50 },
  { key: 'won', label: 'סגור!', color: 'border-emerald-100', accent: 'bg-emerald-600', order: 60 },
  { key: 'lost', label: 'לא רלוונטי', color: 'border-gray-100', accent: 'bg-gray-400', order: 70 },
  { key: 'churned', label: 'בוטל / נטישה', color: 'border-red-100', accent: 'bg-red-500', order: 80 },
];

function toDto(row: any): SystemPipelineStageDTO {
  return {
    id: String(row.id),
    key: String(row.key),
    label: String(row.label || ''),
    color: row.color != null ? String(row.color) : null,
    accent: row.accent != null ? String(row.accent) : null,
    order: Number(row.order ?? 0),
    isActive: Boolean(row.isActive ?? true),
  };
}

async function ensureSeededForOrg(params: { organizationId: string }) {
  const existing = await prisma.systemPipelineStage.findMany({
    where: { organizationId: params.organizationId },
    select: { id: true },
    take: 1,
  });

  if (existing.length) return;

  await prisma.systemPipelineStage.createMany({
    data: DEFAULT_STAGES.map((s) => ({
      organizationId: params.organizationId,
      key: s.key,
      label: s.label,
      color: s.color,
      accent: s.accent,
      order: s.order,
      isActive: true,
    })),
    skipDuplicates: true,
  });
}

export async function getSystemPipelineStages(params: { orgSlug: string }): Promise<SystemPipelineStageDTO[]> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  await ensureSeededForOrg({ organizationId: workspace.id });

  const rows = await prisma.systemPipelineStage.findMany({
    where: { organizationId: workspace.id, isActive: true },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    take: 100,
  });

  return rows.map(toDto);
}

export async function createSystemPipelineStage(params: {
  orgSlug: string;
  key: string;
  label: string;
  color?: string | null;
  accent?: string | null;
  order?: number | null;
}): Promise<{ ok: true; stage: SystemPipelineStageDTO } | { ok: false; message: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);

    const key = String(params.key || '').trim();
    const label = String(params.label || '').trim();

    if (!key) return { ok: false, message: 'חובה להזין מזהה שלב (key)' };
    if (!label) return { ok: false, message: 'חובה להזין שם שלב' };

    const created = await prisma.systemPipelineStage.create({
      data: {
        organizationId: workspace.id,
        key,
        label,
        color: params.color != null ? String(params.color) : null,
        accent: params.accent != null ? String(params.accent) : null,
        order: params.order == null ? 0 : Number(params.order),
        isActive: true,
      },
    });

    return { ok: true, stage: toDto(created) };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'שגיאה ביצירת שלב' };
  }
}

export async function updateSystemPipelineStage(params: {
  orgSlug: string;
  id: string;
  label?: string;
  color?: string | null;
  accent?: string | null;
  order?: number | null;
  isActive?: boolean;
}): Promise<{ ok: true; stage: SystemPipelineStageDTO } | { ok: false; message: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const id = String(params.id || '').trim();
    if (!id) return { ok: false, message: 'id חסר' };

    const existing = await prisma.systemPipelineStage.findFirst({
      where: { id, organizationId: workspace.id },
    });
    if (!existing) return { ok: false, message: 'Stage not found' };

    const data: any = {};
    if (params.label !== undefined) {
      const label = String(params.label || '').trim();
      if (!label) return { ok: false, message: 'חובה להזין שם שלב' };
      data.label = label;
    }
    if (params.color !== undefined) data.color = params.color == null ? null : String(params.color);
    if (params.accent !== undefined) data.accent = params.accent == null ? null : String(params.accent);
    if (params.order !== undefined) data.order = params.order == null ? 0 : Number(params.order);
    if (params.isActive !== undefined) data.isActive = Boolean(params.isActive);

    const updated = await prisma.systemPipelineStage.update({
      where: { id },
      data,
    });

    return { ok: true, stage: toDto(updated) };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'שגיאה בעדכון שלב' };
  }
}

export async function deleteSystemPipelineStage(params: {
  orgSlug: string;
  id: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
    const id = String(params.id || '').trim();
    if (!id) return { ok: false, message: 'id חסר' };

    const existing = await prisma.systemPipelineStage.findFirst({
      where: { id, organizationId: workspace.id },
      select: { id: true, key: true },
    });
    if (!existing) return { ok: false, message: 'Stage not found' };

    const leadCount = await prisma.systemLead.count({
      where: { organizationId: workspace.id, status: String(existing.key) },
    });
    if (leadCount > 0) {
      return { ok: false, message: 'לא ניתן למחוק שלב שיש בו לידים' };
    }

    await prisma.systemPipelineStage.delete({
      where: { id: existing.id },
    });

    return { ok: true };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'שגיאה במחיקת שלב' };
  }
}

export async function assertSystemPipelineStageExists(params: {
  orgSlug: string;
  key: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  await ensureSeededForOrg({ organizationId: workspace.id });

  const key = String(params.key || '').trim();
  if (!key) return { ok: false, message: 'סטטוס חסר' };

  const row = await prisma.systemPipelineStage.findFirst({
    where: { organizationId: workspace.id, key, isActive: true },
    select: { id: true },
  });

  if (!row?.id) return { ok: false, message: 'סטטוס לא קיים במערכת' };
  return { ok: true };
}
