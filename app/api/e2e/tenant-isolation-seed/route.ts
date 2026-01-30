import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

import { createServiceRoleClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function safeString(value: unknown): string {
  return String(value ?? '').trim();
}

function formatSupabaseError(err: any) {
  if (!err) return null;
  return {
    message: err?.message ?? null,
    code: err?.code ?? null,
    details: err?.details ?? null,
    hint: err?.hint ?? null,
  };
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

        return existing.data as any;
      }

      return insertRes.data as any;
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
        const err = insertRes.error as any;
        const code = String(err?.code || '');
        const details = String(err?.details || '');

        // This DB enforces 1 organization per owner (unique owner_id).
        // Make the seed idempotent by reusing the existing org.
        if (code === '23505' && (details.includes('(owner_id)') || String(err?.message || '').includes('organizations_owner_id_key'))) {
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

          return existing.data as any;
        }

        throw Object.assign(new Error(err?.message || 'Failed to create organization'), { supabase: formatSupabaseError(err) });
      }

      return insertRes.data as any;
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

      return res.data as any;
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

      return res.data as any;
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

      const organizationId = (orgRes.data as any)?.organization_id ? String((orgRes.data as any).organization_id) : '';
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

      return res.data as any;
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

      return res.data as any;
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
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Seed failed', supabase: e?.supabase ?? null },
      { status: 500 }
    );
  }
}
