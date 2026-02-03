import 'server-only';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

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
    kind: true;
    module_key: true;
    quantity: true;
    status: true;
    start_at: true;
    end_at: true;
  };
}>;

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

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
  return {
    has_nexus: activeModules.has('nexus'),
    has_system: activeModules.has('system'),
    has_social: activeModules.has('social'),
    has_finance: activeModules.has('finance'),
    has_client: activeModules.has('client'),
    has_operations: activeModules.has('operations'),
  };
}

async function safeUpdateOrganization(params: {
  organizationId: string;
  patch: Record<string, unknown>;
}): Promise<void> {
  const patch = { ...params.patch };
  try {
    type SocialOrganizationsUpdateData = Parameters<typeof prisma.social_organizations.update>[0]['data'];
    const data: SocialOrganizationsUpdateData = {
      has_nexus: Boolean(patch.has_nexus),
      has_system: Boolean(patch.has_system),
      has_social: Boolean(patch.has_social),
      has_finance: Boolean(patch.has_finance),
      has_client: Boolean(patch.has_client),
      has_operations: Boolean(patch.has_operations),
      seats_allowed: patch.seats_allowed == null ? null : Number(patch.seats_allowed),
      updated_at: patch.updated_at ? new Date(String(patch.updated_at)) : new Date(),
    };
    await prisma.social_organizations.update({
      where: { id: params.organizationId },
      data,
    });
  } catch (e: unknown) {
    const obj = asObject(e);
    const code = String(obj?.code || '');
    const msg = String(obj?.message || '');
    if (code === 'P2022') {
      // Best-effort: retry without missing columns.
      type SocialOrganizationsUpdateData = Parameters<typeof prisma.social_organizations.update>[0]['data'];
      const retryPatch: SocialOrganizationsUpdateData = {
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
      await prisma.social_organizations.update({
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
    const org = await prisma.social_organizations.findUnique({
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
    items = await prisma.subscription_items.findMany({
      where: {
        organization_id: organizationId,
        status: 'active',
      },
      select: {
        kind: true,
        module_key: true,
        quantity: true,
        status: true,
        start_at: true,
        end_at: true,
      },
      take: 2000,
    });
  } catch (e: unknown) {
    const obj = asObject(e);
    if (String(obj?.code || '') === 'P2021' || isMissingRelationError(e)) {
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
  } catch {
    // ignore
  }

  return { seatsAllowed, entitlements: flags };
}
