import 'server-only';

import { createClient } from '@/lib/supabase';

type OrgModuleFlags = {
  has_nexus: boolean;
  has_system: boolean;
  has_social: boolean;
  has_finance: boolean;
  has_client: boolean;
  has_operations: boolean;
};

function isMissingColumnError(error: any, columnName: string): boolean {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes('column') && msg.includes(String(columnName).toLowerCase());
}

function isMissingRelationError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();
  const code = String((error as any)?.code || '').toLowerCase();
  return code === '42p01' || message.includes('does not exist') || message.includes('relation') || message.includes('table');
}

function normalizeQuantity(q: any): number | null {
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
  patch: Record<string, any>;
}): Promise<void> {
  const supabase = createClient();

  const attempt = await supabase
    .from('organizations')
    .update(params.patch)
    .eq('id', params.organizationId);

  if (!attempt.error) return;

  const patch = { ...params.patch };

  if (isMissingColumnError(attempt.error, 'seats_allowed')) {
    delete patch.seats_allowed;
  }
  if (isMissingColumnError(attempt.error, 'has_operations')) {
    delete patch.has_operations;
  }

  const retry = await supabase
    .from('organizations')
    .update(patch)
    .eq('id', params.organizationId);

  if (retry.error) throw retry.error;
}

async function safeReadOrganizationEntitlements(params: {
  organizationId: string;
}): Promise<{ seatsAllowed: number; entitlements: OrgModuleFlags }> {
  const supabase = createClient();

  const attempt = await supabase
    .from('organizations')
    .select('has_nexus,has_system,has_social,has_finance,has_client,has_operations,seats_allowed')
    .eq('id', params.organizationId)
    .maybeSingle();

  if (!attempt.error) {
    const row: any = attempt.data || {};
    const entitlements: OrgModuleFlags = {
      has_nexus: Boolean(row.has_nexus),
      has_system: Boolean(row.has_system),
      has_social: Boolean(row.has_social),
      has_finance: Boolean(row.has_finance),
      has_client: Boolean(row.has_client),
      has_operations: Boolean(row.has_operations),
    };
    const seatsFromOrg = normalizeQuantity((row as any).seats_allowed);
    const seatsAllowed = seatsFromOrg ?? (entitlements.has_nexus ? 5 : 1);
    return { seatsAllowed, entitlements };
  }

  // Best-effort: retry without missing columns.
  const msg = String(attempt.error?.message || '').toLowerCase();
  const hasSeats = !(msg.includes('column') && msg.includes('seats_allowed'));
  const hasOps = !(msg.includes('column') && msg.includes('has_operations'));

  const columns = [
    'has_nexus',
    'has_system',
    'has_social',
    'has_finance',
    'has_client',
    hasOps ? 'has_operations' : null,
    hasSeats ? 'seats_allowed' : null,
  ].filter(Boolean);

  const retry = await supabase
    .from('organizations')
    .select(columns.join(','))
    .eq('id', params.organizationId)
    .maybeSingle();

  const row: any = retry.data || {};
  const entitlements: OrgModuleFlags = {
    has_nexus: Boolean(row.has_nexus),
    has_system: Boolean(row.has_system),
    has_social: Boolean(row.has_social),
    has_finance: Boolean(row.has_finance),
    has_client: Boolean(row.has_client),
    has_operations: Boolean((row as any).has_operations),
  };
  const seatsFromOrg = normalizeQuantity((row as any).seats_allowed);
  const seatsAllowed = seatsFromOrg ?? (entitlements.has_nexus ? 5 : 1);
  return { seatsAllowed, entitlements };
}

export async function syncOrganizationAccessFromBilling(params: {
  organizationId: string;
  actorClerkUserId?: string | null;
}): Promise<{ seatsAllowed: number; entitlements: OrgModuleFlags }> {
  const supabase = createClient();
  const organizationId = String(params.organizationId || '').trim();
  if (!organizationId) throw new Error('organizationId missing');

  const nowIso = new Date().toISOString();
  const now = new Date(nowIso);

  const { data: items, error: itemsError } = await supabase
    .from('subscription_items')
    .select('kind,module_key,quantity,status,start_at,end_at')
    .eq('organization_id', organizationId)
    .eq('status', 'active');

  if (itemsError) {
    if (isMissingRelationError(itemsError)) {
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
    throw new Error(itemsError.message);
  }

  // If billing layer exists but no items were created yet, do not override legacy org flags.
  if (!items || items.length === 0) {
    return await safeReadOrganizationEntitlements({ organizationId });
  }

  const activeModules = new Set<string>();
  let seatsQty: number | null = null;

  for (const row of items || []) {
    const startAtRaw = (row as any)?.start_at ? new Date(String((row as any).start_at)) : null;
    const endAtRaw = (row as any)?.end_at ? new Date(String((row as any).end_at)) : null;
    if (startAtRaw && !Number.isNaN(startAtRaw.getTime()) && startAtRaw > now) continue;
    if (endAtRaw && !Number.isNaN(endAtRaw.getTime()) && endAtRaw <= now) continue;

    const kind = String((row as any)?.kind || '');
    if (kind === 'module') {
      const mk = String((row as any)?.module_key || '').trim();
      if (mk) activeModules.add(mk);
      continue;
    }

    if (kind === 'seats') {
      const q = normalizeQuantity((row as any)?.quantity);
      if (q) seatsQty = seatsQty == null ? q : Math.max(seatsQty, q);
    }
  }

  const flags = computeOrgFlagsFromModules(activeModules);

  const seatsAllowed = flags.has_nexus ? (seatsQty ?? 5) : 1;

  await safeUpdateOrganization({
    organizationId,
    patch: {
      ...flags,
      seats_allowed: seatsAllowed,
      updated_at: nowIso,
    },
  });

  try {
    await supabase.from('billing_events').insert({
      organization_id: organizationId,
      event_type: 'org_access_synced',
      occurred_at: nowIso,
      actor_clerk_user_id: params.actorClerkUserId ?? null,
      payload: {
        has_nexus: flags.has_nexus,
        has_system: flags.has_system,
        has_social: flags.has_social,
        has_finance: flags.has_finance,
        has_client: flags.has_client,
        has_operations: flags.has_operations,
        seats_allowed: seatsAllowed,
      },
    } as any);
  } catch {
    // ignore
  }

  return { seatsAllowed, entitlements: flags };
}
