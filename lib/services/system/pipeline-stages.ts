import 'server-only';

import prisma from '@/lib/prisma';

import { asObject, getUnknownErrorMessage } from '@/lib/shared/unknown';

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

type StageRow = {
  id: unknown;
  key: unknown;
  label: unknown;
  color: unknown;
  accent: unknown;
  order: unknown;
  isActive: unknown;
};

function toDto(row: unknown): SystemPipelineStageDTO {
  const obj = asObject(row) ?? {};
  return {
    id: String(obj.id ?? ''),
    key: String(obj.key ?? ''),
    label: String(obj.label ?? ''),
    color: obj.color != null ? String(obj.color) : null,
    accent: obj.accent != null ? String(obj.accent) : null,
    order: Number(obj.order ?? 0),
    isActive: Boolean(obj.isActive ?? true),
  };
}

const seededOrgIds = new Set<string>();

async function ensureSeededForOrg(params: { organizationId: string }) {
  const orgId = String(params.organizationId || '').trim();
  if (!orgId) return;

  // In-memory cache: skip DB check if we already seeded this org in this process
  if (seededOrgIds.has(orgId)) return;

  const existing = await prisma.systemPipelineStage.findFirst({
    where: { organizationId: orgId },
    select: { id: true },
  });
  if (existing?.id) {
    seededOrgIds.add(orgId);
    return;
  }

  await prisma.systemPipelineStage.createMany({
    data: DEFAULT_STAGES.map((s) => ({
      organizationId: orgId,
      key: String(s.key),
      label: String(s.label),
      color: String(s.color),
      accent: String(s.accent),
      order: Number(s.order),
      isActive: true,
    })),
    skipDuplicates: true,
  });
  seededOrgIds.add(orgId);
}

export async function getSystemPipelineStagesForOrganizationId(params: {
  organizationId: string;
}): Promise<SystemPipelineStageDTO[]> {
  await ensureSeededForOrg({ organizationId: params.organizationId });

  const orgId = String(params.organizationId || '').trim();
  if (!orgId) return [];

  const rows = await prisma.systemPipelineStage.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
    },
    select: {
      id: true,
      key: true,
      label: true,
      color: true,
      accent: true,
      order: true,
      isActive: true,
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    take: 100,
  });

  return rows.map(toDto);
}

export async function createSystemPipelineStageForOrganizationId(params: {
  organizationId: string;
  key: string;
  label: string;
  color?: string | null;
  accent?: string | null;
  order?: number | null;
}): Promise<{ ok: true; stage: SystemPipelineStageDTO } | { ok: false; message: string }> {
  try {
    const orgId = String(params.organizationId || '').trim();
    if (!orgId) return { ok: false, message: 'Missing organizationId' };

    const key = String(params.key || '').trim();
    const label = String(params.label || '').trim();

    if (!key) return { ok: false, message: 'חובה להזין מזהה שלב (key)' };
    if (!label) return { ok: false, message: 'חובה להזין שם שלב' };
    const color = params.color != null ? String(params.color) : null;
    const accent = params.accent != null ? String(params.accent) : null;
    const order = params.order == null ? 0 : Number(params.order);

    const row = await prisma.systemPipelineStage.upsert({
      where: {
        organizationId_key: {
          organizationId: orgId,
          key: String(key),
        },
      },
      create: {
        organizationId: orgId,
        key: String(key),
        label: String(label),
        color,
        accent,
        order,
        isActive: true,
      },
      update: {
        organizationId: orgId,
        label: String(label),
        color,
        accent,
        order,
        isActive: true,
      },
      select: {
        id: true,
        key: true,
        label: true,
        color: true,
        accent: true,
        order: true,
        isActive: true,
      },
    });

    return { ok: true, stage: toDto(row) };
  } catch (e: unknown) {
    return { ok: false, message: getUnknownErrorMessage(e) || 'שגיאה ביצירת שלב' };
  }
}

export async function updateSystemPipelineStageForOrganizationId(params: {
  organizationId: string;
  id: string;
  label?: string;
  color?: string | null;
  accent?: string | null;
  order?: number | null;
  isActive?: boolean;
}): Promise<{ ok: true; stage: SystemPipelineStageDTO } | { ok: false; message: string }> {
  try {
    const orgId = String(params.organizationId || '').trim();
    if (!orgId) return { ok: false, message: 'Missing organizationId' };

    const id = String(params.id || '').trim();
    if (!id) return { ok: false, message: 'id חסר' };

    const existing = await prisma.systemPipelineStage.findFirst({
      where: { id: String(id), organizationId: orgId },
      select: { id: true },
    });
    if (!existing?.id) return { ok: false, message: 'Stage not found' };

    const nextLabel = params.label !== undefined ? String(params.label || '').trim() : null;
    if (params.label !== undefined && !nextLabel) return { ok: false, message: 'חובה להזין שם שלב' };

    const data: Record<string, unknown> = {};
    if (params.label !== undefined) data.label = String(nextLabel);
    if (params.color !== undefined) data.color = params.color == null ? null : String(params.color);
    if (params.accent !== undefined) data.accent = params.accent == null ? null : String(params.accent);
    if (params.order !== undefined) data.order = params.order == null ? 0 : Number(params.order);
    if (params.isActive !== undefined) data.isActive = Boolean(params.isActive);

    const updated = await prisma.systemPipelineStage.updateMany({
      where: { id: String(id), organizationId: orgId },
      data,
    });
    if (!updated.count) return { ok: false, message: 'Stage not found' };

    const row = await prisma.systemPipelineStage.findFirst({
      where: { id: String(id), organizationId: orgId },
      select: {
        id: true,
        key: true,
        label: true,
        color: true,
        accent: true,
        order: true,
        isActive: true,
      },
    });

    if (!row) return { ok: false, message: 'Stage not found' };
    return { ok: true, stage: toDto(row) };
  } catch (e: unknown) {
    return { ok: false, message: getUnknownErrorMessage(e) || 'שגיאה בעדכון שלב' };
  }
}

export async function deleteSystemPipelineStageForOrganizationId(params: {
  organizationId: string;
  id: string;
  moveLeadsToKey?: string;
}): Promise<{ ok: true } | { ok: false; message: string; leadCount?: number }> {
  try {
    const orgId = String(params.organizationId || '').trim();
    if (!orgId) return { ok: false, message: 'Missing organizationId' };

    const id = String(params.id || '').trim();
    if (!id) return { ok: false, message: 'id חסר' };

    const existing = await prisma.systemPipelineStage.findFirst({
      where: { id: String(id), organizationId: orgId },
      select: { id: true, key: true },
    });
    if (!existing?.id) return { ok: false, message: 'Stage not found' };

    const leadCount = await prisma.systemLead.count({
      where: { organizationId: orgId, status: String(existing.key) },
    });

    if (leadCount > 0) {
      const moveToKey = params.moveLeadsToKey ? String(params.moveLeadsToKey).trim() : '';

      if (!moveToKey) {
        return { ok: false, message: `בשלב זה יש ${leadCount} לידים. בחר שלב להעביר אותם אליו.`, leadCount };
      }

      // Verify target stage exists and is active
      const targetStage = await prisma.systemPipelineStage.findFirst({
        where: { organizationId: orgId, key: moveToKey, isActive: true },
        select: { id: true },
      });
      if (!targetStage) {
        return { ok: false, message: 'שלב היעד לא נמצא או לא פעיל' };
      }

      // Move all leads to the target stage
      await prisma.systemLead.updateMany({
        where: { organizationId: orgId, status: String(existing.key) },
        data: { status: moveToKey },
      });
    }

    const deleted = await prisma.systemPipelineStage.deleteMany({
      where: { id: String(existing.id), organizationId: orgId },
    });
    if (!deleted.count) return { ok: false, message: 'Stage not found' };

    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, message: getUnknownErrorMessage(e) || 'שגיאה במחיקת שלב' };
  }
}

export async function assertSystemPipelineStageExistsForOrganizationId(params: {
  organizationId: string;
  key: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  await ensureSeededForOrg({ organizationId: params.organizationId });

  const orgId = String(params.organizationId || '').trim();
  if (!orgId) return { ok: false, message: 'סטטוס לא קיים במערכת' };

  const key = String(params.key || '').trim();
  if (!key) return { ok: false, message: 'סטטוס חסר' };

  const existing = await prisma.systemPipelineStage.findFirst({
    where: {
      organizationId: orgId,
      key: String(key),
      isActive: true,
    },
    select: { id: true },
  });

  if (!existing?.id) return { ok: false, message: 'סטטוס לא קיים במערכת' };
  return { ok: true };
}
