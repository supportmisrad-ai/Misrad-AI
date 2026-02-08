import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import crypto from 'node:crypto';
import { enterTenantIsolationContext } from '@/lib/prisma-tenant-guard';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';

export const dynamic = 'force-dynamic';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(req: Request) {
  try {
    const expected = process.env.E2E_API_KEY;
    const provided = req.headers.get('x-e2e-key');

    if (!expected || !provided || provided !== expected) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const bodyJson: unknown = await req.json().catch(() => null);
    const bodyObj = asObject(bodyJson) ?? {};
    const orgSlug = String(bodyObj.orgSlug || '').trim();

    if (!orgSlug) {
      return NextResponse.json({ ok: false, error: 'orgSlug is required' }, { status: 400 });
    }

    const org = isUuid(orgSlug)
      ? await prisma.organization.findFirst({
          where: { OR: [{ slug: orgSlug }, { id: orgSlug }] },
          select: { id: true },
        })
      : await prisma.organization.findFirst({
          where: { slug: orgSlug },
          select: { id: true },
        });

    const isE2E =
      String(process.env.IS_E2E_TESTING || '').toLowerCase() === 'true' ||
      String(process.env.IS_E2E_TESTING || '').toLowerCase() === '1';

    let organizationId = org?.id || null;

    if (!organizationId && isE2E) {
      try {
        const maybeId = isUuid(orgSlug) ? orgSlug : undefined;
        const e2eOwnerId = crypto.randomUUID();

        const created = await prisma.$transaction(async (tx) => {
          await tx.social_users.create({
            data: {
              id: e2eOwnerId,
              clerk_user_id: `e2e_${e2eOwnerId}`,
              email: `e2e_${orgSlug}@test.local`,
              full_name: 'E2E Test User',
              organization_id: null,
              role: 'owner',
              created_at: new Date(),
              updated_at: new Date(),
            },
          });

          const createdOrg = await tx.social_organizations.create({
            data: {
              ...(maybeId ? { id: maybeId } : {}),
              name: 'E2E Workspace',
              slug: orgSlug,
              owner_id: e2eOwnerId,
              has_nexus: true,
              has_social: true,
              has_system: true,
              has_finance: true,
              has_client: true,
              has_operations: true,
            },
            select: { id: true },
          });

          await tx.social_users.update({
            where: { id: e2eOwnerId },
            data: { organization_id: createdOrg.id, updated_at: new Date() },
          });

          return createdOrg;
        });

        organizationId = created?.id || null;
      } catch {
        // fall through to re-query below
      }

      if (!organizationId) {
        const again = await prisma.organization.findFirst({
          where: isUuid(orgSlug) ? { OR: [{ slug: orgSlug }, { id: orgSlug }] } : { slug: orgSlug },
          select: { id: true },
        });
        organizationId = again?.id || null;
      }
    }

    if (!organizationId) {
      return NextResponse.json({ ok: false, error: 'Organization not found' }, { status: 404 });
    }

    enterTenantIsolationContext({
      source: 'e2e_lead_won_chain',
      organizationId,
    });

    const now = Date.now();
    const leadObj = asObject(bodyObj.lead) ?? {};
    const leadName = String(leadObj.name || `E2E Lead ${now}`).trim();
    const phone = String(leadObj.phone || `050${String(now).slice(-7)}`).trim();
    const email = String(leadObj.email || `e2e+${now}@misrad.com`).trim();
    const company = String(leadObj.company || 'E2E Company').trim();
    const value = Number(leadObj.value ?? 1000);
    const installationAddress = String(leadObj.installationAddress || 'תל אביב 1').trim();

    if (!leadName) {
      return NextResponse.json({ ok: false, error: 'Lead name is required' }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ ok: false, error: 'Lead phone is required' }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ ok: false, error: 'Lead email is required' }, { status: 400 });
    }
    if (!installationAddress) {
      return NextResponse.json({ ok: false, error: 'installationAddress is required' }, { status: 400 });
    }

    const lead = await prisma.systemLead.create({
      data: {
        organizationId,
        name: leadName,
        company: company || null,
        phone,
        email,
        source: 'e2e',
        status: 'won',
        value: new Prisma.Decimal(value || 0),
        lastContact: new Date(),
        installationAddress,
        isHot: false,
        score: 50,
      },
      select: { id: true },
    });

    const project = await prisma.operationsProject.create({
      data: {
        organizationId,
        canonicalClientId: null,
        title: company?.trim() ? company.trim() : leadName,
        status: 'ACTIVE',
        installationAddress,
        addressNormalized: null,
        source: 'system_lead',
        sourceRefId: lead.id,
      },
      select: { id: true },
    });

    const invoice = await prisma.systemInvoice.create({
      data: {
        organizationId,
        leadId: lead.id,
        client: company?.trim() ? company.trim() : leadName,
        amount: new Prisma.Decimal(value || 0),
        status: 'pending',
        item: 'מכירה (System)',
      },
      select: { id: true },
    });

    return NextResponse.json({
      ok: true,
      leadId: lead.id,
      operationsProjectId: project.id,
      systemInvoiceId: invoice.id,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: getErrorMessage(e) || 'E2E route failed',
      },
      { status: 500 }
    );
  }
}
