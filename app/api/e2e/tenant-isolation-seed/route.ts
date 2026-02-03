import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

import { createServiceRoleClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function safeString(value: unknown): string {
  return String(value ?? '').trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function formatSupabaseError(err: unknown) {
  if (!err) return null;
  const obj = isRecord(err) ? err : null;
  if (!obj) return null;
  return {
    message: 'message' in obj ? obj.message ?? null : null,
    code: 'code' in obj ? obj.code ?? null : null,
    details: 'details' in obj ? obj.details ?? null : null,
    hint: 'hint' in obj ? obj.hint ?? null : null,
  };
}

function decodeJwtPayload(token: string): unknown | null {
  try {
    const t = String(token || '').trim();
    const parts = t.split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
    const json = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json) as unknown;
  } catch {
    return null;
  }
}

function coerceRowWithId(data: unknown): { id: string } & Record<string, unknown> {
  if (!isRecord(data)) {
    throw new Error('Invalid Supabase response: expected object row');
  }
  const id = safeString(data.id);
  if (!id) {
    throw new Error('Invalid Supabase response: missing id');
  }
  return { ...data, id };
}

export async function POST(req: Request) {
  try {
    const expected = process.env.E2E_API_KEY;
    const provided = req.headers.get('x-e2e-key');

    if (!expected || !provided || provided !== expected) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);

    const victimClerkUserId = safeString(body?.victimClerkUserId);
    const attackerClerkUserId = safeString(body?.attackerClerkUserId);

    const victimEmail = safeString(body?.victimEmail) || null;
    const attackerEmail = safeString(body?.attackerEmail) || null;

    if (!victimClerkUserId || !attackerClerkUserId) {
      return NextResponse.json({ ok: false, error: 'victimClerkUserId and attackerClerkUserId are required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true') {
      try {
        const host = (() => {
          try {
            return new URL(String(supabaseUrl)).host;
          } catch {
            return String(supabaseUrl || '');
          }
        })();

        const payload = serviceKey ? decodeJwtPayload(String(serviceKey)) : null;
        const payloadObj = isRecord(payload) ? payload : null;
        const role = payloadObj && payloadObj.role != null ? safeString(payloadObj.role) : null;
        const iss = payloadObj && payloadObj.iss != null ? safeString(payloadObj.iss) : null;
        const ref = payloadObj && payloadObj.ref != null ? safeString(payloadObj.ref) : null;
        const aud = payloadObj && payloadObj.aud != null ? safeString(payloadObj.aud) : null;

        const dbUrl = String(process.env.DATABASE_URL || '').trim();
        const directUrl = String(process.env.DIRECT_URL || '').trim();
        const dbHost = (() => {
          try {
            return new URL(dbUrl).host;
          } catch {
            return dbUrl ? '(invalid DATABASE_URL)' : '(missing DATABASE_URL)';
          }
        })();
        const directHost = (() => {
          try {
            return new URL(directUrl).host;
          } catch {
            return directUrl ? '(invalid DIRECT_URL)' : '(missing DIRECT_URL)';
          }
        })();

        console.warn('[E2E][tenant-isolation-seed] supabase host:', host);
        console.warn('[E2E][tenant-isolation-seed] service role key is jwt:', Boolean(payload));
        console.warn('[E2E][tenant-isolation-seed] service role key role claim:', role);
        console.warn('[E2E][tenant-isolation-seed] service role key iss claim:', iss);
        console.warn('[E2E][tenant-isolation-seed] service role key ref claim:', ref);
        console.warn('[E2E][tenant-isolation-seed] service role key aud claim:', aud);
        console.warn('[E2E][tenant-isolation-seed] DATABASE_URL host:', dbHost);
        console.warn('[E2E][tenant-isolation-seed] DIRECT_URL host:', directHost);
      } catch {
        // ignore
      }
    }

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 500 });
    }

    const admin = createServiceRoleClient({ allowUnscoped: true, reason: 'e2e_tenant_isolation_seed' });

    const now = Date.now();

    const createSocialUser = async (params: { clerkUserId: string; email: string | null; fullName: string }) => {
      const insertRes = await admin
        .from('social_users')
        .insert({
          clerk_user_id: params.clerkUserId,
          email: params.email,
          full_name: params.fullName,
          role: 'owner',
          allowed_modules: ['nexus', 'system', 'social', 'finance', 'client', 'operations'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id, clerk_user_id')
        .single();

      if (insertRes.error) {
        // If already exists, load it.
        const existing = await admin
          .from('social_users')
          .select('id, clerk_user_id')
          .eq('clerk_user_id', params.clerkUserId)
          .single();

        if (existing.error) {
          throw Object.assign(new Error(existing.error.message), { supabase: formatSupabaseError(existing.error) });
        }

        return coerceRowWithId(existing.data);
      }

      return coerceRowWithId(insertRes.data);
    };

    const victimSocialUser = await createSocialUser({
      clerkUserId: victimClerkUserId,
      email: victimEmail,
      fullName: `Victim ${now}`,
    });

    const attackerSocialUser = await createSocialUser({
      clerkUserId: attackerClerkUserId,
      email: attackerEmail,
      fullName: `Hacker ${now}`,
    });

    const createOrg = async (params: { name: string; slug: string; ownerId: string }) => {
      const nowIso = new Date().toISOString();
      const insertRes = await admin
        .from('organizations')
        .insert({
          name: params.name,
          slug: params.slug,
          owner_id: params.ownerId,
          has_nexus: true,
          has_system: true,
          has_social: true,
          has_finance: true,
          has_client: true,
          has_operations: true,
          subscription_status: 'trial',
          subscription_plan: null,
          trial_start_date: nowIso,
          trial_days: 7,
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select('id, slug, name')
        .single();

      if (insertRes.error) {
        const err = insertRes.error as unknown;
        const errObj = isRecord(err) ? err : {};
        const code = safeString(errObj.code);
        const details = safeString(errObj.details);
        const message = safeString(errObj.message);

        // This DB enforces 1 organization per owner (unique owner_id).
        // Make the seed idempotent by reusing the existing org.
        if (code === '23505' && (details.includes('(owner_id)') || message.includes('organizations_owner_id_key'))) {
          const existing = await admin
            .from('organizations')
            .select('id, slug, name')
            .eq('owner_id', params.ownerId)
            .maybeSingle();

          if (existing.error || !existing.data?.id) {
            throw Object.assign(new Error(existing.error?.message || 'Failed to load existing organization'), {
              supabase: formatSupabaseError(existing.error),
            });
          }

          return coerceRowWithId(existing.data);
        }

        throw Object.assign(new Error(message || 'Failed to create organization'), { supabase: formatSupabaseError(err) });
      }

      return coerceRowWithId(insertRes.data);
    };

    const orgTarget = await createOrg({
      name: `Org_Target ${now}`,
      slug: `org-target-${now}`,
      ownerId: String(victimSocialUser.id),
    });

    const orgAttacker = await createOrg({
      name: `Org_Attacker ${now}`,
      slug: `org-attacker-${now}`,
      ownerId: String(attackerSocialUser.id),
    });

    const updateSocialOrg = async (params: { clerkUserId: string; organizationId: string }) => {
      const res = await admin
        .from('social_users')
        .update({
          organization_id: params.organizationId,
          updated_at: new Date().toISOString(),
        })
        .eq('clerk_user_id', params.clerkUserId);

      if (res.error) {
        throw Object.assign(new Error(res.error.message), { supabase: formatSupabaseError(res.error) });
      }
    };

    await updateSocialOrg({ clerkUserId: victimClerkUserId, organizationId: String(orgTarget.id) });
    await updateSocialOrg({ clerkUserId: attackerClerkUserId, organizationId: String(orgAttacker.id) });

    // Seed client_clients rows for RLS verification.
    const createClientClient = async (params: { organizationId: string; fullName: string; email: string | null }) => {
      const nowIso = new Date().toISOString();
      const res = await admin
        .from('client_clients')
        .insert({
          organization_id: params.organizationId,
          full_name: params.fullName,
          email: params.email,
          phone: null,
          notes: null,
          metadata: { seed: true, createdAt: nowIso },
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select('id, organization_id')
        .single();

      if (res.error) {
        throw Object.assign(new Error(res.error.message), { supabase: formatSupabaseError(res.error) });
      }

      return coerceRowWithId(res.data);
    };

    const victimClient = await createClientClient({
      organizationId: String(orgTarget.id),
      fullName: `Victim Client ${now}`,
      email: victimEmail,
    });

    const attackerClient = await createClientClient({
      organizationId: String(orgAttacker.id),
      fullName: `Attacker Client ${now}`,
      email: attackerEmail,
    });

    const createCrmClient = async (params: {
      organizationId: string;
      name: string;
      companyName: string;
      email: string;
      phone: string;
    }) => {
      const nowIso = new Date().toISOString();
      const portalToken = randomBytes(16).toString('hex');
      const res = await admin
        .from('clients')
        .insert({
          organization_id: params.organizationId,
          name: params.name,
          company_name: params.companyName,
          email: params.email,
          phone: params.phone,
          portal_token: portalToken,
          status: 'Active',
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select('id, organization_id')
        .single();

      if (res.error) {
        throw Object.assign(new Error(res.error.message), { supabase: formatSupabaseError(res.error) });
      }

      return coerceRowWithId(res.data);
    };

    const victimCrmClient = await createCrmClient({
      organizationId: String(orgTarget.id),
      name: `Victim CRM Client ${now}`,
      companyName: `Victim CRM Company ${now}`,
      email: victimEmail || `victim-${now}@example.com`,
      phone: `050000${String(now).slice(-4)}`,
    });

    const attackerCrmClient = await createCrmClient({
      organizationId: String(orgAttacker.id),
      name: `Attacker CRM Client ${now}`,
      companyName: `Attacker CRM Company ${now}`,
      email: attackerEmail || `attacker-${now}@example.com`,
      phone: `050999${String(now).slice(-4)}`,
    });

    const createSocialPost = async (params: { clientId: string; content: string }) => {
      const nowIso = new Date().toISOString();

      const orgRes = await admin
        .from('clients')
        .select('organization_id')
        .eq('id', params.clientId)
        .maybeSingle();

      if (orgRes.error) {
        throw Object.assign(new Error(orgRes.error.message), { supabase: formatSupabaseError(orgRes.error) });
      }

      const orgData = isRecord(orgRes.data) ? orgRes.data : null;
      const organizationId = orgData && orgData.organization_id != null ? safeString(orgData.organization_id) : '';
      if (!organizationId) {
        throw new Error('Missing organization_id for seeded social post client');
      }

      const res = await admin
        .from('social_posts')
        .insert({
          organization_id: organizationId,
          client_id: params.clientId,
          content: params.content,
          status: 'draft',
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select('id, client_id')
        .single();

      if (res.error) {
        throw Object.assign(new Error(res.error.message), { supabase: formatSupabaseError(res.error) });
      }

      return coerceRowWithId(res.data);
    };

    const victimSocialPost = await createSocialPost({
      clientId: String(victimCrmClient.id),
      content: `Victim Post ${now}`,
    });

    const attackerSocialPost = await createSocialPost({
      clientId: String(attackerCrmClient.id),
      content: `Attacker Post ${now}`,
    });

    const createSystemLead = async (params: {
      organizationId: string;
      name: string;
      phone: string;
      email: string;
    }) => {
      const nowIso = new Date().toISOString();
      const res = await admin
        .from('system_leads')
        .insert({
          organization_id: params.organizationId,
          name: params.name,
          phone: params.phone,
          email: params.email,
          source: 'e2e',
          status: 'new',
          last_contact: nowIso,
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select('id, organization_id')
        .single();

      if (res.error) {
        throw Object.assign(new Error(res.error.message), { supabase: formatSupabaseError(res.error) });
      }

      return coerceRowWithId(res.data);
    };

    const victimLead = await createSystemLead({
      organizationId: String(orgTarget.id),
      name: `Victim Lead ${now}`,
      phone: `050111${String(now).slice(-4)}`,
      email: victimEmail || `victim-lead-${now}@example.com`,
    });

    const attackerLead = await createSystemLead({
      organizationId: String(orgAttacker.id),
      name: `Attacker Lead ${now}`,
      phone: `050222${String(now).slice(-4)}`,
      email: attackerEmail || `attacker-lead-${now}@example.com`,
    });

    return NextResponse.json({
      ok: true,
      orgTarget,
      orgAttacker,
      victimClient,
      attackerClient,
      victimCrmClient,
      attackerCrmClient,
      victimSocialPost,
      attackerSocialPost,
      victimLead,
      attackerLead,
      victim: { clerkUserId: victimClerkUserId, socialUserId: String(victimSocialUser.id) },
      attacker: { clerkUserId: attackerClerkUserId, socialUserId: String(attackerSocialUser.id) },
    });
  } catch (e: unknown) {
    const errObj = isRecord(e) ? e : null;
    const message = typeof errObj?.message === 'string' ? errObj.message : 'Seed failed';
    const supabase = errObj && 'supabase' in errObj ? errObj.supabase ?? null : null;
    return NextResponse.json(
      { ok: false, error: message || 'Seed failed', supabase },
      { status: 500 }
    );
  }
}
