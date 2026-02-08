import 'server-only';

import prisma from '@/lib/prisma';
import { executeRawOrgScoped, queryRawOrgScoped } from '@/lib/prisma';

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

  const rowsSql = DEFAULT_STAGES.map((_, idx) => {
    const base = 2 + idx * 5;
    return `($1::uuid, $${base}::text, $${base + 1}::text, $${base + 2}::text, $${base + 3}::text, $${base + 4}::int, true)`;
  }).join(',\n        ');

  const values: unknown[] = [
    String(params.organizationId),
    ...DEFAULT_STAGES.flatMap((s) => [String(s.key), String(s.label), String(s.color), String(s.accent), Number(s.order)]),
  ];

  await executeRawOrgScoped(prisma, {
    organizationId: params.organizationId,
    reason: 'system_pipeline_stages_seed_insert',
    query: `
      insert into system_pipeline_stages (
        organization_id,
        "key",
        label,
        color,
        accent,
        "order",
        is_active
      )
      values
        ${rowsSql}
      on conflict (organization_id, "key") do nothing
    `,
    values,
  });
}

export async function getSystemPipelineStagesForOrganizationId(params: {
  organizationId: string;
}): Promise<SystemPipelineStageDTO[]> {
  await ensureSeededForOrg({ organizationId: params.organizationId });

  const rows = await queryRawOrgScoped<StageRow[]>(prisma, {
    organizationId: params.organizationId,
    reason: 'system_pipeline_stages_list',
    query: `
      select
        id,
        "key" as "key",
        label,
        color,
        accent,
        "order" as "order",
        coalesce(is_active, true) as "isActive",
        created_at as "createdAt"
      from system_pipeline_stages
      where organization_id = $1::uuid
        and coalesce(is_active, true) = true
      order by "order" asc, created_at asc
      limit 100
    `,
    values: [String(params.organizationId)],
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

    const rows = await queryRawOrgScoped<StageRow[]>(prisma, {
      organizationId: params.organizationId,
      reason: 'system_pipeline_stages_create',
      query: `
        insert into system_pipeline_stages (
          organization_id,
          "key",
          label,
          color,
          accent,
          "order",
          is_active,
          created_at,
          updated_at
        )
        values ($1::uuid, $2::text, $3::text, $4::text, $5::text, $6::int, true, now(), now())
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
          "order" as "order",
          coalesce(is_active, true) as "isActive"
      `,
      values: [String(params.organizationId), String(key), String(label), color, accent, order],
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

    const existing = await queryRawOrgScoped<{ id: string }[]>(prisma, {
      organizationId: params.organizationId,
      reason: 'system_pipeline_stages_update_check',
      query: `
        select id
        from system_pipeline_stages
        where organization_id = $1::uuid
          and id::text = $2::text
        limit 1
      `,
      values: [String(params.organizationId), String(id)],
    });
    if (!existing?.[0]?.id) return { ok: false, message: 'Stage not found' };

    const nextLabel = params.label !== undefined ? String(params.label || '').trim() : null;
    if (params.label !== undefined && !nextLabel) return { ok: false, message: 'חובה להזין שם שלב' };

    const setParts: string[] = [];
    const values: unknown[] = [String(params.organizationId), String(id)];
    let nextIdx = 3;

    if (params.label !== undefined) {
      setParts.push(`label = $${nextIdx}::text`);
      values.push(String(nextLabel));
      nextIdx += 1;
    }
    if (params.color !== undefined) {
      setParts.push(`color = $${nextIdx}::text`);
      values.push(params.color == null ? null : String(params.color));
      nextIdx += 1;
    }
    if (params.accent !== undefined) {
      setParts.push(`accent = $${nextIdx}::text`);
      values.push(params.accent == null ? null : String(params.accent));
      nextIdx += 1;
    }
    if (params.order !== undefined) {
      setParts.push(`"order" = $${nextIdx}::int`);
      values.push(params.order == null ? 0 : Number(params.order));
      nextIdx += 1;
    }
    if (params.isActive !== undefined) {
      setParts.push(`is_active = $${nextIdx}::boolean`);
      values.push(Boolean(params.isActive));
      nextIdx += 1;
    }

    setParts.push('updated_at = now()');

    const rows = await queryRawOrgScoped<StageRow[]>(prisma, {
      organizationId: params.organizationId,
      reason: 'system_pipeline_stages_update',
      query: `
        update system_pipeline_stages
        set
          ${setParts.join(',\n          ')}
        where organization_id = $1::uuid
          and id::text = $2::text
        returning
          id,
          "key" as "key",
          label,
          color,
          accent,
          "order" as "order",
          coalesce(is_active, true) as "isActive"
      `,
      values,
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

    const existingRows = await queryRawOrgScoped<unknown[]>(prisma, {
      organizationId: params.organizationId,
      reason: 'system_pipeline_stages_delete_check',
      query: `
        select
          id,
          "key" as "key"
        from system_pipeline_stages
        where organization_id = $1::uuid
          and id::text = $2::text
        limit 1
      `,
      values: [String(params.organizationId), String(id)],
    });
    const existing = existingRows?.[0];
    const existingObj = asObject(existing);
    const existingId = String(existingObj?.id ?? '');
    const existingKey = String(existingObj?.key ?? '');
    if (!existingId) return { ok: false, message: 'Stage not found' };

    const leadCountRows = await queryRawOrgScoped<{ cnt: number }[]>(prisma, {
      organizationId: params.organizationId,
      reason: 'system_pipeline_stages_delete_lead_count',
      query: `
        select count(*)::int as cnt
        from system_leads
        where organization_id = $1::uuid
          and status = $2::text
      `,
      values: [String(params.organizationId), String(existingKey)],
    });
    const leadCount = Number(leadCountRows?.[0]?.cnt ?? 0);
    if (leadCount > 0) {
      return { ok: false, message: 'לא ניתן למחוק שלב שיש בו לידים' };
    }

    await executeRawOrgScoped(prisma, {
      organizationId: params.organizationId,
      reason: 'system_pipeline_stages_delete',
      query: `
        delete from system_pipeline_stages
        where organization_id = $1::uuid
          and id::text = $2::text
      `,
      values: [String(params.organizationId), String(existingId)],
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
  const rows = await queryRawOrgScoped<{ id: string }[]>(prisma, {
    organizationId: params.organizationId,
    reason: 'system_pipeline_stages_assert_exists',
    query: `
      select id
      from system_pipeline_stages
      where organization_id = $1::uuid
        and "key" = $2::text
        and coalesce(is_active, true) = true
      limit 1
    `,
    values: [String(params.organizationId), String(key)],
  });

  if (!rows?.[0]?.id) return { ok: false, message: 'סטטוס לא קיים במערכת' };
  return { ok: true };
}
