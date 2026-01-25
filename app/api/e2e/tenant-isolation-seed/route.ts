import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function safeString(value: unknown): string {
  return String(value ?? '').trim();
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

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

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
          throw new Error(existing.error.message);
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id, slug, name')
        .single();

      if (insertRes.error) {
        throw new Error(insertRes.error.message);
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
        throw new Error(res.error.message);
      }
    };

    await updateSocialOrg({ clerkUserId: victimClerkUserId, organizationId: String(orgTarget.id) });
    await updateSocialOrg({ clerkUserId: attackerClerkUserId, organizationId: String(orgAttacker.id) });

    return NextResponse.json({
      ok: true,
      orgTarget,
      orgAttacker,
      victim: { clerkUserId: victimClerkUserId, socialUserId: String(victimSocialUser.id) },
      attacker: { clerkUserId: attackerClerkUserId, socialUserId: String(attackerSocialUser.id) },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Seed failed' }, { status: 500 });
  }
}
