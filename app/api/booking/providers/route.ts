import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { requireWorkspaceAccessByOrgSlugApi } from '@/lib/server/workspace';
import { requireOrganizationId } from '@/lib/tenant-isolation';

/**
 * GET /api/booking/providers?orgSlug=xxx
 * Fetch all providers for organization
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

    // Workspace access guard (includes auth check internally)
    const workspace = await requireWorkspaceAccessByOrgSlugApi(orgSlug);
    const organizationId = workspace.id;
    requireOrganizationId('GET /api/booking/providers', organizationId);

    // Fetch providers with stats
    const providers = await prisma.bookingProvider.findMany({
      where: { organizationId, isActive: true },
      include: {
        services: {
          where: { isActive: true },
          include: { service: true },
        },
        _count: {
          select: {
            appointments: {
              where: {
                startTime: { gte: new Date() },
                status: { notIn: ['cancelled', 'completed'] },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Calculate stats
    const stats = {
      total: providers.length,
      active: providers.filter((p: { isActive: boolean }) => p.isActive).length,
    };

    return NextResponse.json({ providers, stats });
  } catch (error) {
    console.error('GET /api/booking/providers error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/booking/providers
 * Create a new provider
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

    // Workspace access guard (includes auth check internally)
    const workspace = await requireWorkspaceAccessByOrgSlugApi(orgSlug);
    const organizationId = workspace.id;
    requireOrganizationId('POST /api/booking/providers', organizationId);

    // Create provider
    const provider = await prisma.bookingProvider.create({
      data: {
        organizationId,
        name: data.name,
        email: data.email || '',
        phone: data.phone || null,
        avatar: data.avatar || null,
        isActive: data.isActive ?? true,
        bufferMinutes: data.bufferMinutes || 0,
        maxDailyAppointments: data.maxDailyAppointments || 20,
      },
    });

    return NextResponse.json({ provider });
  } catch (error) {
    console.error('POST /api/booking/providers error:', error);
    return NextResponse.json(
      { error: 'Failed to create provider' },
      { status: 500 }
    );
  }
}
