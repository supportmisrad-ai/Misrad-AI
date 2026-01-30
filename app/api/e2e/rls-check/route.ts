import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function safeString(value: unknown): string {
  return String(value ?? '').trim();
}

export async function POST(req: Request) {
  try {
    const expectedKey = process.env.E2E_API_KEY;
    const providedKey = req.headers.get('x-e2e-key');

    if (!expectedKey || !providedKey || providedKey !== expectedKey) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'NoAuthSession' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const expectedOrgId = safeString(body?.expectedOrgId);
    const otherOrgId = safeString(body?.otherOrgId);
    const expectedClientId = safeString(body?.expectedClientId);
    const otherClientId = safeString(body?.otherClientId);
    const expectedLeadId = safeString(body?.expectedLeadId);
    const otherLeadId = safeString(body?.otherLeadId);
    const expectedPostId = safeString(body?.expectedPostId);
    const otherPostId = safeString(body?.otherPostId);

    if (!expectedOrgId || !otherOrgId) {
      return NextResponse.json({ ok: false, error: 'expectedOrgId and otherOrgId are required' }, { status: 400 });
    }

    const supabase = createClient();

    const rpcRes = await supabase.rpc('current_organization_id');
    let currentOrgId = rpcRes.error ? null : (rpcRes.data ? String(rpcRes.data) : null);

    if (!currentOrgId) {
      const service = createServiceRoleClient({ allowUnscoped: true, reason: 'e2e_rls_check_resolve_org' });
      const orgFromUser = await service
        .from('social_users')
        .select('organization_id')
        .eq('clerk_user_id', userId)
        .maybeSingle();
      if (!orgFromUser.error) {
        const resolved = (orgFromUser.data as any)?.organization_id;
        currentOrgId = resolved ? String(resolved) : null;
      }
    }

    const expectedRead = await supabase.from('organizations').select('id').eq('id', expectedOrgId).maybeSingle();
    const otherRead = await supabase.from('organizations').select('id').eq('id', otherOrgId).maybeSingle();

    const expectedClientRead = expectedClientId
      ? await supabase.from('client_clients').select('id, organization_id').eq('id', expectedClientId).maybeSingle()
      : { data: null as any, error: null as any };

    const otherClientRead = otherClientId
      ? await supabase.from('client_clients').select('id, organization_id').eq('id', otherClientId).maybeSingle()
      : { data: null as any, error: null as any };

    const expectedLeadRead = expectedLeadId
      ? await supabase.from('system_leads').select('id, organization_id').eq('id', expectedLeadId).maybeSingle()
      : { data: null as any, error: null as any };

    const otherLeadRead = otherLeadId
      ? await supabase.from('system_leads').select('id, organization_id').eq('id', otherLeadId).maybeSingle()
      : { data: null as any, error: null as any };

    const expectedPostRead = expectedPostId
      ? await supabase.from('social_posts').select('id, client_id').eq('id', expectedPostId).maybeSingle()
      : { data: null as any, error: null as any };

    const otherPostRead = otherPostId
      ? await supabase.from('social_posts').select('id, client_id').eq('id', otherPostId).maybeSingle()
      : { data: null as any, error: null as any };

    const expectedVisible = Boolean(expectedRead.data?.id) || (currentOrgId ? currentOrgId === expectedOrgId : false);
    const otherVisible = Boolean(otherRead.data?.id) && (currentOrgId ? currentOrgId === otherOrgId : false);

    const expectedClientVisible = Boolean(expectedClientRead.data?.id);
    const otherClientVisible = Boolean(otherClientRead.data?.id);

    const expectedLeadVisible = Boolean(expectedLeadRead.data?.id);
    const otherLeadVisible = Boolean(otherLeadRead.data?.id);

    const expectedPostVisible = Boolean(expectedPostRead.data?.id);
    const otherPostVisible = Boolean(otherPostRead.data?.id);

    return NextResponse.json({
      ok: true,
      currentOrgId,
      expectedOrg: {
        id: expectedOrgId,
        visible: expectedVisible,
        error: expectedRead.error?.message ?? null,
      },
      otherOrg: {
        id: otherOrgId,
        visible: otherVisible,
        error: otherRead.error?.message ?? null,
      },
      expectedClient: {
        id: expectedClientId || null,
        visible: expectedClientVisible,
        orgId: (expectedClientRead.data as any)?.organization_id ?? null,
        error: expectedClientRead.error?.message ?? null,
      },
      otherClient: {
        id: otherClientId || null,
        visible: otherClientVisible,
        orgId: (otherClientRead.data as any)?.organization_id ?? null,
        error: otherClientRead.error?.message ?? null,
      },
      expectedLead: {
        id: expectedLeadId || null,
        visible: expectedLeadVisible,
        orgId: (expectedLeadRead.data as any)?.organization_id ?? null,
        error: expectedLeadRead.error?.message ?? null,
      },
      otherLead: {
        id: otherLeadId || null,
        visible: otherLeadVisible,
        orgId: (otherLeadRead.data as any)?.organization_id ?? null,
        error: otherLeadRead.error?.message ?? null,
      },
      expectedPost: {
        id: expectedPostId || null,
        visible: expectedPostVisible,
        clientId: (expectedPostRead.data as any)?.client_id ?? null,
        error: expectedPostRead.error?.message ?? null,
      },
      otherPost: {
        id: otherPostId || null,
        visible: otherPostVisible,
        clientId: (otherPostRead.data as any)?.client_id ?? null,
        error: otherPostRead.error?.message ?? null,
      },
      rpcError: rpcRes.error?.message ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'RLS check failed' }, { status: 500 });
  }
}
