import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { requireOrganizationId } from '@/lib/tenant-isolation';

/**
 * GET /api/booking/appointments?orgSlug=xxx&start=xxx&end=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('orgSlug');
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!orgSlug) {
      return NextResponse.json({ error: 'orgSlug is required' }, { status: 400 });
    }

    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    const organizationId = workspace.id;
    requireOrganizationId('GET /api/booking/appointments', organizationId);

    const where: Record<string, unknown> = { organizationId };
    
    if (start || end) {
      where.startTime = {};
      if (start) (where.startTime as Record<string, unknown>).gte = new Date(start);
      if (end) (where.startTime as Record<string, unknown>).lte = new Date(end);
    }

    const appointments = await prisma.bookingAppointment.findMany({
      where,
      include: {
        provider: true,
        service: true,
        link: true,
        payment: true,
      },
      orderBy: { startTime: 'asc' },
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error('GET /api/booking/appointments error:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}

/**
 * POST /api/booking/appointments
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgSlug, ...data } = body;

    if (!orgSlug) {
      return NextResponse.json({ error: 'orgSlug is required' }, { status: 400 });
    }

    const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
    const organizationId = workspace.id;
    requireOrganizationId('POST /api/booking/appointments', organizationId);

    // Check for conflicts
    const conflict = await prisma.bookingAppointment.findFirst({
      where: {
        providerId: data.providerId,
        status: { notIn: ['cancelled', 'no_show'] },
        OR: [
          {
            startTime: { lt: new Date(data.endTime) },
            endTime: { gt: new Date(data.startTime) },
          },
        ],
      },
    });

    if (conflict) {
      return NextResponse.json({ error: 'הזמן כבר תפוס' }, { status: 409 });
    }

    const appointment = await prisma.bookingAppointment.create({
      data: {
        organizationId,
        linkId: data.linkId || '',
        providerId: data.providerId,
        serviceId: data.serviceId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone || null,
        customerCompany: data.customerCompany || null,
        customerReason: data.customerReason || null,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        timezone: 'Asia/Jerusalem',
        locationType: data.locationType || 'zoom',
        status: 'confirmed',
      },
      include: {
        provider: true,
        service: true,
      },
    });

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error('POST /api/booking/appointments error:', error);
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
  }
}
