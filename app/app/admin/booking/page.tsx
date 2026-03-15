import { Suspense } from 'react';
import { BookingAdminPanel } from '@/components/admin/BookingAdminPanel';
import { prefetchBookingData } from '@/lib/booking/cache';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { redirect } from 'next/navigation';
import { LinksPageClient } from '@/components/admin/booking/LinksPageClient';
import prisma from '@/lib/prisma';

interface PageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BookingAdminPage({ searchParams }: PageProps) {
  try {
    const resolvedParams = await searchParams;
    const tab = typeof resolvedParams?.tab === 'string' ? resolvedParams.tab : 'calendar';
    
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

    // Render appropriate content based on tab
    const renderContent = () => {
      switch (tab) {
        case 'links':
          return <LinksPageClient orgSlug={orgSlug} initialLinks={linksData as any} />;
        case 'calendar':
        case 'appointments':
        case 'providers':
        case 'services':
        case 'settings':
        default:
          return (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {tab === 'calendar' && 'יומן תורים'}
                {tab === 'appointments' && 'רשימת תורים'}
                {tab === 'providers' && 'נותני שירות'}
                {tab === 'services' && 'שירותים'}
                {tab === 'settings' && 'הגדרות'}
              </h3>
              <p className="text-slate-500">תוכן יטען בקרוב...</p>
            </div>
          );
      }
    };

    return (
      <Suspense fallback={<BookingAdminPanel orgSlug={orgSlug} />}>
        <BookingAdminPanel 
          orgSlug={orgSlug} 
          initialData={{
            providersCount: data.stats.providersCount,
            servicesCount: data.stats.servicesCount,
            linksCount: data.stats.linksCount,
            todayAppointments: data.stats.todayAppointments,
            pendingPayments: data.stats.pendingPayments,
          }}
        >
          {renderContent()}
        </BookingAdminPanel>
      </Suspense>
    );
  } catch (error) {
    console.error('[Booking] Error:', error);
    redirect('/app/admin?error=booking_error');
  }
}
