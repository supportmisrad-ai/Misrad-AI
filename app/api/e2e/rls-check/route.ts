import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { blockE2eInProduction } from '@/lib/api-e2e-guard';
import prisma, { executeRawAllowlisted, queryRawAllowlisted } from '@/lib/prisma';
import { enterTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const IS_PROD = process.env.NODE_ENV === 'production';

function safeString(value: unknown): string {
  return String(value ?? '').trim();
}

export async function POST(req: Request) {
  const blocked = blockE2eInProduction();
  if (blocked) return blocked;

  try {
    const expectedKey = process.env.E2E_API_KEY;
    const providedKey = req.headers.get('x-e2e-key');

    if (!expectedKey || !providedKey || providedKey !== expectedKey) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const authRes = await auth();
    const userId = authRes.userId;
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'NoAuthSession' }, { status: 401 });
    }

    const bodyJson: unknown = await req.json().catch(() => null);
    const bodyObj = asObject(bodyJson) ?? {};
    const expectedOrgId = safeString(bodyObj.expectedOrgId);
    const otherOrgId = safeString(bodyObj.otherOrgId);
    const expectedClientId = safeString(bodyObj.expectedClientId);
    const otherClientId = safeString(bodyObj.otherClientId);
    const expectedLeadId = safeString(bodyObj.expectedLeadId);
    const otherLeadId = safeString(bodyObj.otherLeadId);
    const expectedPostId = safeString(bodyObj.expectedPostId);
    const otherPostId = safeString(bodyObj.otherPostId);

    if (!expectedOrgId || !otherOrgId) {
      return NextResponse.json({ ok: false, error: 'expectedOrgId and otherOrgId are required' }, { status: 400 });
    }
    if (!expectedClientId || !otherClientId || !expectedLeadId || !otherLeadId || !expectedPostId || !otherPostId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'expectedClientId, otherClientId, expectedLeadId, otherLeadId, expectedPostId, otherPostId are required',
        },
        { status: 400 }
      );
    }

    const membership = await prisma.organizationUser.findUnique({
      where: { clerk_user_id: String(userId) },
      select: { organization_id: true },
    });

    const orgIdFromSocial = membership?.organization_id ? String(membership.organization_id) : null;
    const orgIdFromProfile = orgIdFromSocial
      ? null
      : await prisma.profile
          .findFirst({
            where: { clerkUserId: String(userId) },
            select: { organizationId: true },
          })
          .then((p) => (p?.organizationId ? String(p.organizationId) : null));

    const organizationId = orgIdFromSocial || orgIdFromProfile;
    if (!organizationId) {
      return NextResponse.json({ ok: false, error: 'Failed to resolve organizationId for user' }, { status: 500 });
    }

    enterTenantIsolationContext({
      source: 'e2e_rls_check',
      organizationId,
    });

    const claims = JSON.stringify({
      role: 'authenticated',
      organization_id: organizationId,
      org_id: organizationId,
      clerk_user_id: String(userId),
      sub: String(userId),
    });

    type RlsRow = {
      current_org_id: string | null;
      expected_org_visible: boolean;
      other_org_visible: boolean;
      expected_client_visible: boolean;
      other_client_visible: boolean;
      expected_lead_visible: boolean;
      other_lead_visible: boolean;
      expected_post_visible: boolean;
      other_post_visible: boolean;
      expected_client_org_id: string | null;
      other_client_org_id: string | null;
      expected_lead_org_id: string | null;
      other_lead_org_id: string | null;
      expected_post_client_id: string | null;
      other_post_client_id: string | null;
    };

    const rows = await prisma.$transaction(
      async (tx) => {
      await executeRawAllowlisted(tx, {
        reason: 'e2e_rls_check_setup_role',
        query: 'set local role authenticated',
        values: [],
      });

      await executeRawAllowlisted(tx, {
        reason: 'e2e_rls_check_setup_claims',
        query: "select set_config('request.jwt.claims', $1, true)",
        values: [claims],
      });

      const sql = `
select
  public.current_organization_id()::text as current_org_id,
  exists (select 1 from public.organizations o where o.id = $1::uuid) as expected_org_visible,
  exists (select 1 from public.organizations o where o.id = $2::uuid) as other_org_visible,
  exists (select 1 from public.client_clients c where c.id = $3::uuid) as expected_client_visible,
  exists (select 1 from public.client_clients c where c.id = $4::uuid) as other_client_visible,
  exists (select 1 from public.system_leads l where l.id = $5::uuid) as expected_lead_visible,
  exists (select 1 from public.system_leads l where l.id = $6::uuid) as other_lead_visible,
  exists (select 1 from public.social_posts p where p.id = $7::uuid) as expected_post_visible,
  exists (select 1 from public.social_posts p where p.id = $8::uuid) as other_post_visible,
  (select c.organization_id::text from public.client_clients c where c.id = $3::uuid limit 1) as expected_client_org_id,
  (select c.organization_id::text from public.client_clients c where c.id = $4::uuid limit 1) as other_client_org_id,
  (select l.organization_id::text from public.system_leads l where l.id = $5::uuid limit 1) as expected_lead_org_id,
  (select l.organization_id::text from public.system_leads l where l.id = $6::uuid limit 1) as other_lead_org_id,
  (select p.client_id::text from public.social_posts p where p.id = $7::uuid limit 1) as expected_post_client_id,
  (select p.client_id::text from public.social_posts p where p.id = $8::uuid limit 1) as other_post_client_id;
`;

      return queryRawAllowlisted<RlsRow[]>(tx, {
        reason: 'e2e_rls_check_select',
        query: sql,
        values: [
          expectedOrgId,
          otherOrgId,
          expectedClientId,
          otherClientId,
          expectedLeadId,
          otherLeadId,
          expectedPostId,
          otherPostId,
        ],
      });
      },
      {
        maxWait: 20_000,
        timeout: 60_000,
      }
    );

    const row = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!row) {
      return NextResponse.json({ ok: false, error: 'RLS check returned no rows' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      currentOrgId: row.current_org_id,
      expectedOrg: { id: expectedOrgId, visible: Boolean(row.expected_org_visible), error: null },
      otherOrg: { id: otherOrgId, visible: Boolean(row.other_org_visible), error: null },
      expectedClient: {
        id: expectedClientId,
        visible: Boolean(row.expected_client_visible),
        orgId: row.expected_client_org_id,
        error: null,
      },
      otherClient: {
        id: otherClientId,
        visible: Boolean(row.other_client_visible),
        orgId: row.other_client_org_id,
        error: null,
      },
      expectedLead: {
        id: expectedLeadId,
        visible: Boolean(row.expected_lead_visible),
        orgId: row.expected_lead_org_id,
        error: null,
      },
      otherLead: {
        id: otherLeadId,
        visible: Boolean(row.other_lead_visible),
        orgId: row.other_lead_org_id,
        error: null,
      },
      expectedPost: {
        id: expectedPostId,
        visible: Boolean(row.expected_post_visible),
        clientId: row.expected_post_client_id,
        error: null,
      },
      otherPost: {
        id: otherPostId,
        visible: Boolean(row.other_post_visible),
        clientId: row.other_post_client_id,
        error: null,
      },
      rpcError: null,
    });
  } catch (e: unknown) {
    const safeMsg = 'RLS check failed';
    return NextResponse.json(
      { ok: false, error: IS_PROD ? safeMsg : getErrorMessage(e) || safeMsg },
      { status: 500 }
    );
  }
}
