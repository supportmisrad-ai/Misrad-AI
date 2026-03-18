import { Suspense } from 'react';
import { FastBookingPanel } from '@/components/booking/FastBookingPanel';
import { prefetchBookingData } from '@/lib/booking/cache';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { redirect } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

type PrismaLinkWithRelations = Prisma.BookingLinkGetPayload<{
  include: {
    services: { include: { service: true } };
    provider: true;
  };
}>;

interface PageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BookingAdminPage({ searchParams }: PageProps) {
  try {
    const resolvedParams = await searchParams;
    const tab = typeof resolvedParams?.tab === 'string' ? resolvedParams.tab : 'calendar';
    const action = typeof resolvedParams?.action === 'string' ? resolvedParams.action : undefined;
    
    // Get current user and their organization (like other admin pages)
    const userId = await getCurrentUserId();
    console.log('[Booking] userId:', userId);
    
    if (!userId) {
      console.log('[Booking] No userId, redirecting to login');
      redirect('/login?redirect=/app/admin/booking');
    }

    // Find the user's organization
    const user = await prisma.organizationUser.findUnique({
      where: { clerk_user_id: userId },
      select: { organization_id: true, id: true }
    });
    console.log('[Booking] user:', user);

    if (!user?.organization_id) {
      console.log('[Booking] No organization_id, redirecting to admin');
      redirect('/app/admin?error=missing_org');
    }

    const organization = await prisma.organization.findUnique({
      where: { id: user.organization_id },
      select: { id: true, slug: true }
    });
    console.log('[Booking] organization:', organization);

    if (!organization) {
      console.log('[Booking] No organization found, redirecting to admin');
      redirect('/app/admin?error=org_not_found');
    }

    const orgSlug = organization.slug || organization.id;
    const organizationId = organization.id;

    // Prefetch data for instant navigation
    const [data, initialLinks] = await Promise.all([
      prefetchBookingData(organizationId),
      // Fetch links for instant render
      prisma.bookingLink.findMany({
        where: { organizationId, isActive: true },
        include: {
          services: { include: { service: true } },
          provider: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const linksData = { links: initialLinks };

    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">טוען...</div>}>
        <FastBookingPanel 
          orgSlug={orgSlug}
          initialStats={{
            providersCount: data.stats.providersCount,
            servicesCount: data.stats.servicesCount,
            linksCount: data.stats.linksCount,
            todayAppointments: data.stats.todayAppointments,
            pendingPayments: data.stats.pendingPayments,
          }}
          initialLinks={{ links: initialLinks }}
        />
      </Suspense>
    );
  } catch (error) {
    console.error('[Booking] Error:', error);
    redirect('/app/admin?error=booking_error');
  }
}
