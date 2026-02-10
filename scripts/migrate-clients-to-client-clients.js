/* eslint-disable no-console */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

function toNumber(v) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

async function getTableCount(supabase, table) {
  // 1) Robust existence probe (avoids false positives where count is null)
  const probe = await supabase.from(table).select('id').limit(1);
  if (probe.error) {
    const msg = String(probe.error.message || '').toLowerCase();
    const isMissing =
      msg.includes(`could not find the table 'public.${String(table).toLowerCase()}'`) ||
      msg.includes('does not exist') ||
      msg.includes('pgrst205') ||
      (probe.error.code && String(probe.error.code).toUpperCase() === 'PGRST205');
    if (isMissing) return { exists: false, count: 0 };
    throw probe.error;
  }

  // 2) Best-effort exact count
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) {
    // If count fails but table exists, return count unknown.
    return { exists: true, count: null };
  }
  return { exists: true, count: count ?? 0 };
}

async function resolveLegacyTable(supabase) {
  if (process.env.LEGACY_CLIENTS_TABLE) return process.env.LEGACY_CLIENTS_TABLE;

  const candidates = ['clients', 'misrad_clients', 'socialmedia_clients', 'nexus_clients'];
  const found = [];

  for (const table of candidates) {
    const info = await getTableCount(supabase, table);
    if (info.exists) found.push({ table, count: info.count });
  }

  // Prefer a non-empty table (when count is available).
  const nonEmpty = found.filter((x) => typeof x.count === 'number' && x.count > 0);
  if (nonEmpty.length > 0) {
    nonEmpty.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
    return nonEmpty[0].table;
  }

  // Fall back to any existing table.
  if (found.length > 0) return found[0].table;

  return 'clients';
}

async function fetchAllLegacyClients(supabase, legacyTable) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];

  for (;;) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from(legacyTable)
      .select('*')
      .range(from, to);

    if (error) throw error;
    if (!data || data.length === 0) break;

    rows.push(...data);
    if (data.length < pageSize) break;

    from += pageSize;
  }

  return rows;
}

function mapLegacyToClientClientsRow(row, sourceTable, defaultOrgId) {
  const id = row.id;
  const organization_id = row.organization_id || defaultOrgId || null;

  // Normalize a "display name" into full_name
  const companyName =
    row.company_name ||
    row.companyName ||
    row.full_name ||
    row.fullName ||
    row.name ||
    'לקוח חדש';

  let metadata = { legacy: { source: sourceTable } };

  if (sourceTable === 'clients' || sourceTable === 'socialmedia_clients') {
    metadata = {
      // Social UI contract
      name: row.name || companyName,
      companyName,
      businessId: row.business_id ?? row.businessId ?? null,
      avatar: row.avatar ?? null,
      brandVoice: row.brand_voice ?? row.brandVoice ?? null,
      postingRhythm: row.posting_rhythm ?? row.postingRhythm ?? null,
      status: row.status ?? null,
      onboardingStatus: row.onboarding_status ?? row.onboardingStatus ?? null,
      invitationToken: row.invitation_token ?? row.invitationToken ?? null,
      portalToken: row.portal_token ?? row.portalToken ?? null,
      color: row.color ?? null,
      plan: row.plan ?? null,
      monthlyFee: row.monthly_fee ?? row.monthlyFee ?? null,
      nextPaymentDate: row.next_payment_date ?? row.nextPaymentDate ?? null,
      nextPaymentAmount: row.next_payment_amount ?? row.nextPaymentAmount ?? null,
      paymentStatus: row.payment_status ?? row.paymentStatus ?? null,
      autoRemindersEnabled: row.auto_reminders_enabled ?? row.autoRemindersEnabled ?? null,
      savedCardThumbnail: row.saved_card_thumbnail ?? row.savedCardThumbnail ?? null,
      internalNotes: row.internal_notes ?? row.internalNotes ?? null,

      legacy: {
        source: sourceTable,
        user_id: row.user_id ?? row.userId ?? null,
        created_at: row.created_at ?? row.createdAt ?? null,
        updated_at: row.updated_at ?? row.updatedAt ?? null,
        deleted_at: row.deleted_at ?? row.deletedAt ?? null,
        deleted_by: row.deleted_by ?? row.deletedBy ?? null,
        last_payment_date: row.last_payment_date ?? row.lastPaymentDate ?? null,
      },
    };
  } else if (sourceTable === 'misrad_clients') {
    metadata = {
      name: row.name || companyName,
      companyName: row.name || companyName,
      status: row.status ?? null,
      internalNotes: row.internal_notes ?? row.internalNotes ?? null,
      // Keep the full Misrad AI row for traceability
      legacy: {
        source: sourceTable,
        raw: row,
      },
    };
  } else if (sourceTable === 'nexus_clients') {
    metadata = {
      name: row.name || companyName,
      companyName,
      status: row.status ?? null,
      legacy: {
        source: sourceTable,
        raw: row,
      },
    };
  }

  return {
    id,
    organization_id,
    full_name: companyName,
    phone: row.phone ?? null,
    email: row.email ?? null,
    notes: row.internal_notes ?? row.internalNotes ?? row.notes ?? null,
    metadata,
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!url) {
    throw new Error('Missing env var NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)');
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(url, serviceKey);

  const targetTable = process.env.TARGET_CLIENTS_TABLE || 'client_clients';
  const legacyTable = await resolveLegacyTable(supabase);
  const defaultOrgId = process.env.DEFAULT_ORGANIZATION_ID || null;

  if (!defaultOrgId) {
    // only warn; some sources already contain organization_id
    console.log('[migrate] DEFAULT_ORGANIZATION_ID not set (ok if source rows already include organization_id)');
  }

  console.log('[migrate] loading legacy clients...');
  let legacy;
  try {
    legacy = await fetchAllLegacyClients(supabase, legacyTable);
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.includes('PGRST205') || msg.includes(`Could not find the table 'public.${legacyTable}'`)) {
      console.error(`[migrate] FAILED: legacy table "${legacyTable}" not found via PostgREST.`);
      console.error('[migrate] If your legacy table is named differently, re-run with:');
      console.error('         LEGACY_CLIENTS_TABLE=<table_name> node .\\scripts\\migrate-clients-to-client-clients.js');
      console.error('[migrate] Common candidates in this codebase: misrad_clients, social_clients');
      process.exitCode = 1;
      return;
    }
    throw e;
  }
  console.log('[migrate] legacy clients loaded:', legacy.length);
  console.log('[migrate] source table:', legacyTable);

  const missingOrg = legacy.filter((r) => !r.organization_id && !defaultOrgId);
  if (missingOrg.length > 0) {
    console.warn('[migrate] WARNING: source rows missing organization_id and DEFAULT_ORGANIZATION_ID is not set:', missingOrg.length);
  }

  const payload = legacy
    .filter((r) => r.id && (r.organization_id || defaultOrgId))
    .map((r) => mapLegacyToClientClientsRow(r, legacyTable, defaultOrgId));

  console.log(`[migrate] upserting into ${targetTable}:`, payload.length);

  const chunkSize = 200;
  let ok = 0;
  for (let i = 0; i < payload.length; i += chunkSize) {
    const chunk = payload.slice(i, i + chunkSize);
    const { error } = await supabase
      .from(targetTable)
      .upsert(chunk, { onConflict: 'id' });

    if (error) throw error;
    ok += chunk.length;
    console.log(`[migrate] upserted ${ok}/${payload.length}`);
  }

  console.log('[migrate] DONE');
}

main().catch((e) => {
  console.error('[migrate] FAILED:', e);
  process.exitCode = 1;
});
