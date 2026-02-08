import 'server-only';

import prisma from '@/lib/prisma';
import { executeRawOrgScopedSql, queryRawOrgScoped, queryRawOrgScopedSql } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

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

async function ensureSeededForOrg(params: { organizationId: string }) {
  const existing = await queryRawOrgScoped<{ id: string }[]>(prisma, {
    organizationId: params.organizationId,
    reason: 'system_pipeline_stages_seed_check',
    query: `
      select id
      from system_pipeline_stages
      where organization_id = $1::uuid
      limit 1
    `,
    values: [String(params.organizationId)],
  });

  if ((existing || []).length) return;

  const values = DEFAULT_STAGES.map((s) => {
    const rowParts: Prisma.Sql[] = [
      Prisma.sql`${String(params.organizationId)}::uuid`,
      Prisma.sql`${String(s.key)}`,
      Prisma.sql`${String(s.label)}`,
      Prisma.sql`${String(s.color)}`,
      Prisma.sql`${String(s.accent)}`,
      Prisma.sql`${Number(s.order)}`,
      Prisma.sql`${true}`,
    ];
    return Prisma.sql`(${Prisma.join(rowParts)})`;
  });

  const insertColumns: Prisma.Sql[] = [
    Prisma.sql`organization_id`,
    Prisma.sql`${Prisma.raw(`"key"`)}`,
    Prisma.sql`label`,
    Prisma.sql`color`,
    Prisma.sql`accent`,
    Prisma.sql`${Prisma.raw(`"order"`)}`,
    Prisma.sql`is_active`,
  ];

  await executeRawOrgScopedSql(prisma, {
    organizationId: params.organizationId,
    reason: 'system_pipeline_stages_seed_insert',
    sql: Prisma.sql`
      insert into system_pipeline_stages (
        ${Prisma.join(insertColumns)}
      )
      values ${Prisma.join(values)}
      on conflict (organization_id, "key") do nothing
    `,
  });
}

export async function getSystemPipelineStagesForOrganizationId(params: {
  organizationId: string;
}): Promise<SystemPipelineStageDTO[]> {
  await ensureSeededForOrg({ organizationId: params.organizationId });

  const orderSelect = Prisma.sql`"order" as "order"`;
  const orderBy = Prisma.sql`order by "order" asc, created_at asc`;

  const rows = await queryRawOrgScopedSql<StageRow[]>(prisma, {
    organizationId: params.organizationId,
    reason: 'system_pipeline_stages_list',
    sql: Prisma.sql`
      select
        id,
        "key" as "key",
        label,
        color,
        accent,
        ${orderSelect},
        coalesce(is_active, true) as "isActive",
        created_at as "createdAt"
      from system_pipeline_stages
      where organization_id::text = ${String(params.organizationId)}
        and coalesce(is_active, true) = true
      ${orderBy}
      limit 100
    `,
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
    const key = String(params.key || '').trim();
    const label = String(params.label || '').trim();

    if (!key) return { ok: false, message: 'חובה להזין מזהה שלב (key)' };
    if (!label) return { ok: false, message: 'חובה להזין שם שלב' };
    const color = params.color != null ? String(params.color) : null;
    const accent = params.accent != null ? String(params.accent) : null;
    const order = params.order == null ? 0 : Number(params.order);

    const insertColumns: Prisma.Sql[] = [
      Prisma.sql`organization_id`,
      Prisma.sql`${Prisma.raw(`"key"`)}`,
      Prisma.sql`label`,
      Prisma.sql`color`,
      Prisma.sql`accent`,
      Prisma.sql`${Prisma.raw(`"order"`)}`,
      Prisma.sql`is_active`,
      Prisma.sql`created_at`,
      Prisma.sql`updated_at`,
    ];

    const valueParts: Prisma.Sql[] = [
      Prisma.sql`${String(params.organizationId)}::uuid`,
      Prisma.sql`${String(key)}`,
      Prisma.sql`${String(label)}`,
      Prisma.sql`${color}`,
      Prisma.sql`${accent}`,
      Prisma.sql`${order}`,
      Prisma.sql`true`,
      Prisma.sql`now()`,
      Prisma.sql`now()`,
    ];

    const orderReturning = Prisma.sql`"order" as "order"`;

    const rows = await queryRawOrgScopedSql<StageRow[]>(prisma, {
      organizationId: params.organizationId,
      reason: 'system_pipeline_stages_create',
      sql: Prisma.sql`
      insert into system_pipeline_stages (
        ${Prisma.join(insertColumns)}
      )
      values (${Prisma.join(valueParts)})
      on conflict (organization_id, "key") do update set
        label = excluded.label,
        color = excluded.color,
        accent = excluded.accent,
        "order" = excluded."order",
        is_active = true,
        updated_at = now()
      returning
        id,
        "key" as "key",
        label,
        color,
        accent,
        ${orderReturning},
        coalesce(is_active, true) as "isActive"
      `,
    });

    const row = rows?.[0];
    if (!row) return { ok: false, message: 'שגיאה ביצירת שלב' };
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
    const id = String(params.id || '').trim();
    if (!id) return { ok: false, message: 'id חסר' };

    const existing = await queryRawOrgScopedSql<{ id: string }[]>(prisma, {
      organizationId: params.organizationId,
      reason: 'system_pipeline_stages_update_check',
      sql: Prisma.sql`
        select id
        from system_pipeline_stages
        where id::text = ${String(id)}
          and organization_id::text = ${String(params.organizationId)}
        limit 1
      `,
    });
    if (!existing?.[0]?.id) return { ok: false, message: 'Stage not found' };

    const nextLabel = params.label !== undefined ? String(params.label || '').trim() : null;
    if (params.label !== undefined && !nextLabel) return { ok: false, message: 'חובה להזין שם שלב' };

    const orderReturning = Prisma.sql`"order" as "order"`;

    const rows = await queryRawOrgScopedSql<StageRow[]>(prisma, {
      organizationId: params.organizationId,
      reason: 'system_pipeline_stages_update',
      sql: Prisma.sql`
      update system_pipeline_stages
      set
        label = ${params.label !== undefined ? String(nextLabel) : Prisma.raw('label')},
        color = ${params.color !== undefined ? (params.color == null ? null : String(params.color)) : Prisma.raw('color')},
        accent = ${params.accent !== undefined ? (params.accent == null ? null : String(params.accent)) : Prisma.raw('accent')},
        "order" = ${params.order !== undefined ? (params.order == null ? 0 : Number(params.order)) : Prisma.raw('"order"')},
        is_active = ${params.isActive !== undefined ? Boolean(params.isActive) : Prisma.raw('is_active')},
        updated_at = now()
      where id::text = ${String(id)}
        and organization_id::text = ${String(params.organizationId)}
      returning
        id,
        "key" as "key",
        label,
        color,
        accent,
        ${orderReturning},
        coalesce(is_active, true) as "isActive"
      `,
    });

    const row = rows?.[0];
    if (!row) return { ok: false, message: 'Stage not found' };
    return { ok: true, stage: toDto(row) };
  } catch (e: unknown) {
    return { ok: false, message: getUnknownErrorMessage(e) || 'שגיאה בעדכון שלב' };
  }
}

export async function deleteSystemPipelineStageForOrganizationId(params: {
  organizationId: string;
  id: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const id = String(params.id || '').trim();
    if (!id) return { ok: false, message: 'id חסר' };

    const existingRows = await queryRawOrgScopedSql<unknown[]>(prisma, {
      organizationId: params.organizationId,
      reason: 'system_pipeline_stages_delete_check',
      sql: Prisma.sql`
      select
        id,
        "key" as "key"
      from system_pipeline_stages
      where id::text = ${String(id)}
        and organization_id::text = ${String(params.organizationId)}
      limit 1
      `,
    });
    const existing = existingRows?.[0];
    const existingObj = asObject(existing);
    const existingId = String(existingObj?.id ?? '');
    const existingKey = String(existingObj?.key ?? '');
    if (!existingId) return { ok: false, message: 'Stage not found' };

    const leadCountRows = await queryRawOrgScopedSql<{ cnt: number }[]>(prisma, {
      organizationId: params.organizationId,
      reason: 'system_pipeline_stages_delete_lead_count',
      sql: Prisma.sql`
      select count(*)::int as cnt
      from system_leads
      where organization_id::text = ${String(params.organizationId)}
        and status = ${String(existingKey)}
      `,
    });
    const leadCount = Number(leadCountRows?.[0]?.cnt ?? 0);
    if (leadCount > 0) {
      return { ok: false, message: 'לא ניתן למחוק שלב שיש בו לידים' };
    }

    await executeRawOrgScopedSql(prisma, {
      organizationId: params.organizationId,
      reason: 'system_pipeline_stages_delete',
      sql: Prisma.sql`
        delete from system_pipeline_stages
        where id::text = ${String(existingId)}
          and organization_id::text = ${String(params.organizationId)}
      `,
    });

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

  const key = String(params.key || '').trim();
  if (!key) return { ok: false, message: 'סטטוס חסר' };
  const rows = await queryRawOrgScopedSql<{ id: string }[]>(prisma, {
    organizationId: params.organizationId,
    reason: 'system_pipeline_stages_assert_exists',
    sql: Prisma.sql`
      select id
      from system_pipeline_stages
      where organization_id::text = ${String(params.organizationId)}
        and "key" = ${String(key)}
        and coalesce(is_active, true) = true
      limit 1
    `,
  });

  if (!rows?.[0]?.id) return { ok: false, message: 'סטטוס לא קיים במערכת' };
  return { ok: true };
}
