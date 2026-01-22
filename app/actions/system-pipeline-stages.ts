'use server';

import prisma from '@/lib/prisma';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { Prisma } from '@prisma/client';

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

async function resolveStageKeyColumn(): Promise<'stage_key' | 'key'> {
  try {
    const rows = await prisma.$queryRaw<{ column_name: string }[]>(Prisma.sql`
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'system_pipeline_stages'
    `);
    const names = new Set((rows || []).map((r) => String(r.column_name)));
    if (names.has('stage_key')) return 'stage_key';
    if (names.has('key')) return 'key';
    return 'stage_key';
  } catch {
    return 'stage_key';
  }
}

async function resolveSortOrderColumn(): Promise<'sort_order' | 'order' | 'position' | null> {
  try {
    const rows = await prisma.$queryRaw<{ column_name: string }[]>(Prisma.sql`
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'system_pipeline_stages'
    `);
    const names = new Set((rows || []).map((r) => String(r.column_name)));
    if (names.has('sort_order')) return 'sort_order';
    if (names.has('order')) return 'order';
    if (names.has('position')) return 'position';
    return null;
  } catch {
    return null;
  }
}

async function ensureSeededForOrg(params: { organizationId: string }) {
  const col = await resolveStageKeyColumn();
  const sortCol = await resolveSortOrderColumn();

  const existing = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    select id
    from system_pipeline_stages
    where organization_id::text = ${String(params.organizationId)}
    limit 1
  `);

  if ((existing || []).length) return;

  const values = DEFAULT_STAGES.map((s) => {
    const rowParts: Prisma.Sql[] = [
      Prisma.sql`${String(params.organizationId)}::uuid`,
      Prisma.sql`${String(s.key)}`,
      Prisma.sql`${String(s.label)}`,
      Prisma.sql`${String(s.color)}`,
      Prisma.sql`${String(s.accent)}`,
      ...(sortCol ? [Prisma.sql`${Number(s.order)}`] : []),
      Prisma.sql`${true}`,
    ];
    return Prisma.sql`(${Prisma.join(rowParts)})`;
  });

  const insertColumns: Prisma.Sql[] = [
    Prisma.sql`organization_id`,
    Prisma.sql`${Prisma.raw(`"${col}"`)}`,
    Prisma.sql`label`,
    Prisma.sql`color`,
    Prisma.sql`accent`,
    ...(sortCol ? [Prisma.sql`${Prisma.raw(`"${sortCol}"`)}`] : []),
    Prisma.sql`is_active`,
  ];

  await prisma.$executeRaw(Prisma.sql`
    insert into system_pipeline_stages (
      ${Prisma.join(insertColumns)}
    )
    values ${Prisma.join(values)}
    on conflict (organization_id, ${Prisma.raw(`"${col}"`)}) do nothing
  `);
}

export async function getSystemPipelineStages(params: { orgSlug: string }): Promise<SystemPipelineStageDTO[]> {
  const workspace = await requireWorkspaceAccessByOrgSlug(params.orgSlug);
  await ensureSeededForOrg({ organizationId: workspace.id });

  const col = await resolveStageKeyColumn();
  const sortCol = await resolveSortOrderColumn();

  const orderSelect = sortCol
    ? Prisma.sql`${Prisma.raw(`"${sortCol}"`)} as "order"`
    : Prisma.sql`0 as "order"`;

  const orderBy = sortCol
    ? Prisma.sql`order by ${Prisma.raw(`"${sortCol}"`)} asc, created_at asc`
    : Prisma.sql`order by created_at asc`;

  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    select
      id,
      ${Prisma.raw(`"${col}"`)} as "key",
      label,
      color,
      accent,
      ${orderSelect},
      coalesce(is_active, true) as "isActive",
      created_at as "createdAt"
    from system_pipeline_stages
    where organization_id::text = ${String(workspace.id)}
      and coalesce(is_active, true) = true
    ${orderBy}
    limit 100
  `);

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

    const col = await resolveStageKeyColumn();
    const sortCol = await resolveSortOrderColumn();
    const color = params.color != null ? String(params.color) : null;
    const accent = params.accent != null ? String(params.accent) : null;
    const order = params.order == null ? 0 : Number(params.order);

    const insertColumns: Prisma.Sql[] = [
      Prisma.sql`organization_id`,
      Prisma.sql`${Prisma.raw(`"${col}"`)}`,
      Prisma.sql`label`,
      Prisma.sql`color`,
      Prisma.sql`accent`,
      ...(sortCol ? [Prisma.sql`${Prisma.raw(`"${sortCol}"`)}`] : []),
      Prisma.sql`is_active`,
      Prisma.sql`created_at`,
      Prisma.sql`updated_at`,
    ];

    const valueParts: Prisma.Sql[] = [
      Prisma.sql`${String(workspace.id)}::uuid`,
      Prisma.sql`${String(key)}`,
      Prisma.sql`${String(label)}`,
      Prisma.sql`${color}`,
      Prisma.sql`${accent}`,
      ...(sortCol ? [Prisma.sql`${order}`] : []),
      Prisma.sql`true`,
      Prisma.sql`now()`,
      Prisma.sql`now()`,
    ];

    const orderReturning = sortCol
      ? Prisma.sql`${Prisma.raw(`"${sortCol}"`)} as "order"`
      : Prisma.sql`0 as "order"`;

    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      insert into system_pipeline_stages (
        ${Prisma.join(insertColumns)}
      )
      values (${Prisma.join(valueParts)})
      on conflict (organization_id, ${Prisma.raw(`"${col}"`)}) do update set
        label = excluded.label,
        color = excluded.color,
        accent = excluded.accent,
        ${sortCol ? Prisma.sql`${Prisma.raw(`"${sortCol}"`)} = ${Prisma.raw(`excluded."${sortCol}"`)},` : Prisma.sql``}
        is_active = true,
        updated_at = now()
      returning
        id,
        ${Prisma.raw(`"${col}"`)} as "key",
        label,
        color,
        accent,
        ${orderReturning},
        coalesce(is_active, true) as "isActive"
    `);

    const row = rows?.[0];
    if (!row) return { ok: false, message: 'שגיאה ביצירת שלב' };
    return { ok: true, stage: toDto(row) };
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

    const col = await resolveStageKeyColumn();
    const sortCol = await resolveSortOrderColumn();

    const existing = await prisma.$queryRaw<any[]>(Prisma.sql`
      select id
      from system_pipeline_stages
      where id::text = ${String(id)}
        and organization_id::text = ${String(workspace.id)}
      limit 1
    `);
    if (!existing?.[0]?.id) return { ok: false, message: 'Stage not found' };

    const nextLabel = params.label !== undefined ? String(params.label || '').trim() : null;
    if (params.label !== undefined && !nextLabel) return { ok: false, message: 'חובה להזין שם שלב' };

    const orderReturning = sortCol
      ? Prisma.sql`${Prisma.raw(`"${sortCol}"`)} as "order"`
      : Prisma.sql`0 as "order"`;

    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      update system_pipeline_stages
      set
        label = ${params.label !== undefined ? String(nextLabel) : Prisma.raw('label')},
        color = ${params.color !== undefined ? (params.color == null ? null : String(params.color)) : Prisma.raw('color')},
        accent = ${params.accent !== undefined ? (params.accent == null ? null : String(params.accent)) : Prisma.raw('accent')},
        ${sortCol ? Prisma.sql`${Prisma.raw(`"${sortCol}"`)} = ${params.order !== undefined ? (params.order == null ? 0 : Number(params.order)) : Prisma.raw(`"${sortCol}"`)},` : Prisma.sql``}
        is_active = ${params.isActive !== undefined ? Boolean(params.isActive) : Prisma.raw('is_active')},
        updated_at = now()
      where id::text = ${String(id)}
        and organization_id::text = ${String(workspace.id)}
      returning
        id,
        ${Prisma.raw(`"${col}"`)} as "key",
        label,
        color,
        accent,
        ${orderReturning},
        coalesce(is_active, true) as "isActive"
    `);

    const row = rows?.[0];
    if (!row) return { ok: false, message: 'Stage not found' };
    return { ok: true, stage: toDto(row) };
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

    const col = await resolveStageKeyColumn();

    const existingRows = await prisma.$queryRaw<any[]>(Prisma.sql`
      select
        id,
        ${Prisma.raw(`"${col}"`)} as "key"
      from system_pipeline_stages
      where id::text = ${String(id)}
        and organization_id::text = ${String(workspace.id)}
      limit 1
    `);
    const existing = existingRows?.[0];
    if (!existing?.id) return { ok: false, message: 'Stage not found' };

    const leadCountRows = await prisma.$queryRaw<{ cnt: number }[]>(Prisma.sql`
      select count(*)::int as cnt
      from system_leads
      where organization_id::text = ${String(workspace.id)}
        and status = ${String(existing.key)}
    `);
    const leadCount = Number(leadCountRows?.[0]?.cnt ?? 0);
    if (leadCount > 0) {
      return { ok: false, message: 'לא ניתן למחוק שלב שיש בו לידים' };
    }

    await prisma.$executeRaw(Prisma.sql`
      delete from system_pipeline_stages
      where id::text = ${String(existing.id)}
        and organization_id::text = ${String(workspace.id)}
    `);

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

  const col = await resolveStageKeyColumn();
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    select id
    from system_pipeline_stages
    where organization_id::text = ${String(workspace.id)}
      and ${Prisma.raw(`"${col}"`)} = ${String(key)}
      and coalesce(is_active, true) = true
    limit 1
  `);

  if (!rows?.[0]?.id) return { ok: false, message: 'סטטוס לא קיים במערכת' };
  return { ok: true };
}
