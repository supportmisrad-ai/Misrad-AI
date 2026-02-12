import 'server-only';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

import { asObject } from '@/lib/shared/unknown';
import { reportSchemaFallback } from '@/lib/server/schema-fallbacks';
const ALLOW_SCHEMA_FALLBACKS = String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true';

type OrgModuleFlags = {
  has_nexus: boolean;
  has_system: boolean;
  has_social: boolean;
  has_finance: boolean;
  has_client: boolean;
  has_operations: boolean;
};

type SubscriptionItemRow = Prisma.subscription_itemsGetPayload<{
  select: {
    id: true;
    kind: true;
    module_key: true;
    quantity: true;
    status: true;
    start_at: true;
    end_at: true;
  };
}>;

function isMissingColumnError(error: unknown, columnName: string): boolean {
  const obj = asObject(error);
  const msg = String(obj?.message || '').toLowerCase();
  return msg.includes('column') && msg.includes(String(columnName).toLowerCase());
}

function isMissingRelationError(error: unknown): boolean {
  const obj = asObject(error);
  const message = String(obj?.message || '').toLowerCase();
  const code = String(obj?.code || '').toLowerCase();
  return code === '42p01' || message.includes('does not exist') || message.includes('relation') || message.includes('table');
}

function normalizeQuantity(q: unknown): number | null {
  const n = Number.isFinite(Number(q)) ? Math.floor(Number(q)) : null;
  return n && n > 0 ? n : null;
}

function computeOrgFlagsFromModules(activeModules: Set<string>): OrgModuleFlags {
  const hasNexus = activeModules.has('nexus');
  const hasSystem = activeModules.has('system');
  const hasSocial = activeModules.has('social');
  const hasClient = activeModules.has('client');
  const hasOperations = activeModules.has('operations');
  
  // Finance is a free bonus for any paid package
  const hasAnyPaidModule = hasNexus || hasSystem || hasSocial || hasClient || hasOperations;
  
  return {
    has_nexus: hasNexus,
    has_system: hasSystem,
    has_social: hasSocial,
    has_finance: hasAnyPaidModule, // Free bonus
    has_client: hasClient,
    has_operations: hasOperations,
  };
}

async function safeUpdateOrganization(params: {
  organizationId: string;
  patch: Record<string, unknown>;
}): Promise<void> {
  const patch = { ...params.patch };
  try {
    type OrganizationUpdateData = Parameters<typeof prisma.organization.update>[0]['data'];
    const data: OrganizationUpdateData = {
      has_nexus: Boolean(patch.has_nexus),
      has_system: Boolean(patch.has_system),
      has_social: Boolean(patch.has_social),
      has_finance: Boolean(patch.has_finance),
      has_client: Boolean(patch.has_client),
      has_operations: Boolean(patch.has_operations),
      seats_allowed: patch.seats_allowed == null ? null : Number(patch.seats_allowed),
      updated_at: patch.updated_at ? new Date(String(patch.updated_at)) : new Date(),
    };
    await prisma.organization.update({
      where: { id: params.organizationId },
      data,
    });
  } catch (e: unknown) {
    const obj = asObject(e);
    const code = String(obj?.code || '');
    const msg = String(obj?.message || '');
    if (code === 'P2022') {
      if (!ALLOW_SCHEMA_FALLBACKS) {
        throw new Error(`[SchemaMismatch] organization.update: missing column (${msg || 'P2022'})`);
      }

      reportSchemaFallback({
        source: 'lib/billing/sync.safeUpdateOrganization',
        reason: 'organization.update missing column (retry without missing fields)',
        error: e,
        extras: { organizationId: String(params.organizationId), message: msg || code },
      });
      // Best-effort: retry without missing columns.
      type OrganizationUpdateData = Parameters<typeof prisma.organization.update>[0]['data'];
      const retryPatch: OrganizationUpdateData = {
        has_nexus: Boolean(patch.has_nexus),
        has_system: Boolean(patch.has_system),
        has_social: Boolean(patch.has_social),
        has_finance: Boolean(patch.has_finance),
        has_client: Boolean(patch.has_client),
        updated_at: patch.updated_at ? new Date(String(patch.updated_at)) : new Date(),
      };
      if (!msg.toLowerCase().includes('seats_allowed')) {
        retryPatch.seats_allowed = patch.seats_allowed == null ? null : Number(patch.seats_allowed);
      }
      if (!msg.toLowerCase().includes('has_operations')) {
        retryPatch.has_operations = Boolean(patch.has_operations);
      }
      await prisma.organization.update({
        where: { id: params.organizationId },
        data: retryPatch,
      });
      return;
    }
    throw e;
  }
}

async function safeReadOrganizationEntitlements(params: {
  organizationId: string;
}): Promise<{ seatsAllowed: number; entitlements: OrgModuleFlags }> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: params.organizationId },
      select: {
        has_nexus: true,
        has_system: true,
        has_social: true,
        has_finance: true,
        has_client: true,
        has_operations: true,
        seats_allowed: true,
      },
    });

    const entitlements: OrgModuleFlags = {
      has_nexus: Boolean(org?.has_nexus),
      has_system: Boolean(org?.has_system),
      has_social: Boolean(org?.has_social),
      has_finance: Boolean(org?.has_finance),
      has_client: Boolean(org?.has_client),
      has_operations: Boolean(org?.has_operations),
    };

    const seatsFromOrg = normalizeQuantity(org?.seats_allowed);
    const seatsAllowed = seatsFromOrg ?? 1;
    return { seatsAllowed, entitlements };
  } catch (e: unknown) {
    // Preserve previous fallback behavior if schema is missing.
    const obj = asObject(e);
    if (String(obj?.code || '') === 'P2021' || String(obj?.code || '') === 'P2022') {
      if (!ALLOW_SCHEMA_FALLBACKS) {
        throw new Error(`[SchemaMismatch] organization.findUnique: missing table/column (${String(obj?.message || '') || String(obj?.code || '')})`);
      }

      reportSchemaFallback({
        source: 'lib/billing/sync.safeReadOrganizationEntitlements',
        reason: 'organization.findUnique missing table/column (fallback to default entitlements)',
        error: e,
        extras: { organizationId: String(params.organizationId) },
      });
      return {
        seatsAllowed: 1,
        entitlements: {
          has_nexus: false,
          has_system: false,
          has_social: false,
          has_finance: false,
          has_client: false,
          has_operations: false,
        },
      };
    }
    throw e;
  }
}

export async function syncOrganizationAccessFromBilling(params: {
  organizationId: string;
  actorClerkUserId?: string | null;
}): Promise<{ seatsAllowed: number; entitlements: OrgModuleFlags }> {
  const organizationId = String(params.organizationId || '').trim();
  if (!organizationId) throw new Error('organizationId missing');

  const nowIso = new Date().toISOString();
  const now = new Date(nowIso);

  let items: SubscriptionItemRow[] = [];
  try {
    const pageSize = 200;
    const maxTotal = 2000;
    let cursorId: string | null = null;
    const out: SubscriptionItemRow[] = [];

    for (;;) {
      const rows: SubscriptionItemRow[] = await prisma.subscription_items.findMany({
        where: {
          organization_id: organizationId,
          status: 'active',
        },
        select: {
          id: true,
          kind: true,
          module_key: true,
          quantity: true,
          status: true,
          start_at: true,
          end_at: true,
        },
        orderBy: [{ id: 'asc' }],
        ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
        take: pageSize,
      });

      const list: SubscriptionItemRow[] = Array.isArray(rows) ? rows : [];
      if (list.length === 0) break;
      out.push(...list);
      if (out.length >= maxTotal) break;
      if (list.length < pageSize) break;
      const last: SubscriptionItemRow | undefined = list[list.length - 1];
      cursorId = last?.id ? String(last.id) : null;
      if (!cursorId) break;
    }

    items = out.length > maxTotal ? out.slice(0, maxTotal) : out;
  } catch (e: unknown) {
    const obj = asObject(e);
    if (String(obj?.code || '') === 'P2021' || isMissingRelationError(e)) {
      if (!ALLOW_SCHEMA_FALLBACKS) {
        throw new Error(`[SchemaMismatch] subscription_items missing table (${String(obj?.message || '') || 'P2021'})`);
      }

      reportSchemaFallback({
        source: 'lib/billing/sync.syncOrganizationAccessFromBilling',
        reason: 'subscription_items missing table (fallback to default entitlements)',
        error: e,
        extras: { organizationId },
      });
      return {
        seatsAllowed: 1,
        entitlements: {
          has_nexus: false,
          has_system: false,
          has_social: false,
          has_finance: false,
          has_client: false,
          has_operations: false,
        },
      };
    }
    throw e;
  }

  // If billing layer exists but no items were created yet, do not override legacy org flags.
  if (!items || items.length === 0) {
    return await safeReadOrganizationEntitlements({ organizationId });
  }

  const activeModules = new Set<string>();
  let seatsQty: number | null = null;

  for (const row of items || []) {
    const startAtRaw = row.start_at instanceof Date ? row.start_at : row.start_at ? new Date(String(row.start_at)) : null;
    const endAtRaw = row.end_at instanceof Date ? row.end_at : row.end_at ? new Date(String(row.end_at)) : null;
    if (startAtRaw && !Number.isNaN(startAtRaw.getTime()) && startAtRaw > now) continue;
    if (endAtRaw && !Number.isNaN(endAtRaw.getTime()) && endAtRaw <= now) continue;

    const kind = String(row.kind || '');
    if (kind === 'module') {
      const mk = String(row.module_key || '').trim();
      if (mk) activeModules.add(mk);
      continue;
    }

    if (kind === 'seats') {
      const q = normalizeQuantity(row.quantity);
      if (q) seatsQty = seatsQty == null ? q : Math.max(seatsQty, q);
    }
  }

  const flags = computeOrgFlagsFromModules(activeModules);

  const seatsAllowed = flags.has_nexus ? (seatsQty ?? 1) : 1;

  await safeUpdateOrganization({
    organizationId,
    patch: {
      ...flags,
      seats_allowed: seatsAllowed,
      updated_at: nowIso,
    },
  });

  try {
    await prisma.billing_events.create({
      data: {
        organization_id: organizationId,
        event_type: 'org_access_synced',
        occurred_at: new Date(nowIso),
        actor_clerk_user_id: params.actorClerkUserId ?? null,
        payload: {
          has_nexus: flags.has_nexus,
          has_system: flags.has_system,
          has_social: flags.has_social,
          has_finance: flags.has_finance,
          has_client: flags.has_client,
          has_operations: flags.has_operations,
          seats_allowed: seatsAllowed,
        } as Prisma.InputJsonValue,
      },
    });
  } catch (e: unknown) {
    if (isMissingRelationError(e)) {
      if (!ALLOW_SCHEMA_FALLBACKS) {
        throw new Error(`[SchemaMismatch] billing_events missing table (${String(asObject(e)?.message || '') || 'missing relation'})`);
      }

      reportSchemaFallback({
        source: 'lib/billing/sync.syncOrganizationAccessFromBilling',
        reason: 'billing_events missing table (skip audit write)',
        error: e,
        extras: { organizationId, seatsAllowed },
      });
      return { seatsAllowed, entitlements: flags };
    }
    throw e;
  }

  return { seatsAllowed, entitlements: flags };
}
