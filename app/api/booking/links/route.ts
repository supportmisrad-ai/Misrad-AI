import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { requireOrganizationId } from '@/lib/tenant-isolation';

/**
 * GET /api/booking/links?orgSlug=xxx
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
    requireOrganizationId('GET /api/booking/links', organizationId);

    const links = await prisma.bookingLink.findMany({
      where: { organizationId, isActive: true },
      include: {
        provider: true,
        services: { include: { service: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ links });
  } catch (error) {
    console.error('GET /api/booking/links error:', error);
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 });
  }
}

/**
 * POST /api/booking/links
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
    const { orgSlug, serviceIds, ...data } = body;

    if (!orgSlug) {
      return NextResponse.json({ error: 'orgSlug is required' }, { status: 400 });
    }

    // Validate providerId - must be a non-empty UUID
    if (!data.providerId || typeof data.providerId !== 'string' || data.providerId.trim() === '') {
      return NextResponse.json({ error: 'providerId is required and must be a valid UUID' }, { status: 400 });
    }

    const workspace = await requireWorkspaceAccessByOrgSlugApi(orgSlug);
    const organizationId = workspace.id;
    requireOrganizationId('POST /api/booking/links', organizationId);

    // Generate unique slug
    const slug = data.slug || `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;

    const link = await prisma.bookingLink.create({
      data: {
        organizationId,
        providerId: data.providerId,
        slug,
        title: data.title,
        description: data.description || null,
        locationType: data.locationType || 'zoom',
        locationDetails: data.locationDetails || null,
        requireApproval: data.requireApproval ?? false,
        isActive: data.isActive ?? true,
        maxBookingsPerSlot: data.maxBookingsPerSlot || 1,
        availableDays: data.availableDays || [0, 1, 2, 3, 4],
        availableStartTime: data.availableStartTime || '09:00',
        availableEndTime: data.availableEndTime || '17:00',
        services: serviceIds ? {
          create: serviceIds.map((id: string) => ({ serviceId: id }))
        } : undefined,
      },
      include: {
        services: { include: { service: true } },
      },
    });

    return NextResponse.json({ link });
  } catch (error) {
    console.error('POST /api/booking/links error:', error);
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 });
  }
}
