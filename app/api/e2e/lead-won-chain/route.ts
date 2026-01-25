import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

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

    const body = await req.json().catch(() => null);
    const orgSlug = String(body?.orgSlug || '').trim();

    if (!orgSlug) {
      return NextResponse.json({ ok: false, error: 'orgSlug is required' }, { status: 400 });
    }

    const orgWhere = isUuid(orgSlug)
      ? { OR: [{ slug: orgSlug }, { id: orgSlug }] }
      : { slug: orgSlug };

    const org = await prisma.social_organizations.findFirst({
      where: orgWhere as any,
      select: { id: true },
    });

    if (!org?.id) {
      return NextResponse.json({ ok: false, error: 'Organization not found' }, { status: 404 });
    }

    const now = Date.now();
    const leadName = String(body?.lead?.name || `E2E Lead ${now}`).trim();
    const phone = String(body?.lead?.phone || `050${String(now).slice(-7)}`).trim();
    const email = String(body?.lead?.email || `e2e+${now}@misrad.com`).trim();
    const company = String(body?.lead?.company || 'E2E Company').trim();
    const value = Number(body?.lead?.value ?? 1000);
    const installationAddress = String(body?.lead?.installationAddress || 'תל אביב 1').trim();

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
        organizationId: org.id,
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
        organizationId: org.id,
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
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || 'E2E route failed',
      },
      { status: 500 }
    );
  }
}
