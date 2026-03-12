import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { requireOrganizationId } from '@/lib/tenant-isolation';

/**
 * GET /api/booking/services?orgSlug=xxx
 * Protected: Requires authentication and workspace access
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication guard
    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('orgSlug');

    if (!orgSlug) {
      return NextResponse.json({ error: 'orgSlug is required' }, { status: 400 });
    }

    const workspace = await requireWorkspaceAccessByOrgSlugApi(orgSlug);
    const organizationId = workspace.id;
    requireOrganizationId('GET /api/booking/services', organizationId);

    const services = await prisma.bookingService.findMany({
      where: { organizationId, isActive: true },
      include: {
        providers: {
          where: { isActive: true },
          include: { provider: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ services });
  } catch (error) {
    console.error('GET /api/booking/services error:', error);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}

/**
 * POST /api/booking/services
 * Protected: Requires authentication and workspace access
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication guard
    const clerkUserId = await getCurrentUserId();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orgSlug, ...data } = body;

    if (!orgSlug) {
      return NextResponse.json({ error: 'orgSlug is required' }, { status: 400 });
    }

    const workspace = await requireWorkspaceAccessByOrgSlugApi(orgSlug);
    const organizationId = workspace.id;
    requireOrganizationId('POST /api/booking/services', organizationId);

    const service = await prisma.bookingService.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description || null,
        color: data.color || '#6366f1',
        durationMinutes: data.durationMinutes || 30,
        bufferAfterMinutes: data.bufferAfterMinutes || 0,
        priceAmount: data.priceAmount || null,
        currency: data.currency || 'ILS',
        requiresPayment: data.requiresPayment ?? false,
        requiresApproval: data.requiresApproval ?? false,
        requiresReason: data.requiresReason ?? false,
        isActive: data.isActive ?? true,
      },
    });

    return NextResponse.json({ service });
  } catch (error) {
    console.error('POST /api/booking/services error:', error);
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 });
  }
}
