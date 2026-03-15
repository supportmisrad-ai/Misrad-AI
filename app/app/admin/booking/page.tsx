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
  const resolvedParams = await searchParams;
  const tab = typeof resolvedParams?.tab === 'string' ? resolvedParams.tab : 'calendar';
  const action = typeof resolvedParams?.action === 'string' ? resolvedParams.action : null;
  
  // Get current user and their organization (like other admin pages)
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect('/login?redirect=/app/admin/booking');
  }

  // Find the user's organization
  const user = await prisma.organizationUser.findUnique({
    where: { clerk_user_id: userId },
    select: { organization_id: true, id: true }
  });

  if (!user?.organization_id) {
    redirect('/app/admin?error=missing_org');
  }

  const organization = await prisma.organization.findUnique({
    where: { id: user.organization_id },
    select: { id: true, slug: true }
  });

  if (!organization) {
    redirect('/app/admin?error=org_not_found');
  }

  const orgSlug = organization.slug || organization.id;
  const organizationId = organization.id;

  // Prefetch all data for instant navigation
  const data = await prefetchBookingData(organizationId);

  // Render appropriate content based on tab
  const renderContent = () => {
    switch (tab) {
      case 'links':
        return <LinksPageClient orgSlug={orgSlug} />;
      case 'calendar':
      case 'appointments':
      case 'providers':
      case 'services':
      case 'settings':
      default:
        // For now, render placeholder content for other tabs
        return (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {tab === 'calendar' && 'יומן תורים'}
              {tab === 'appointments' && 'רשימת תורים'}
              {tab === 'providers' && 'נותני שירות'}
              {tab === 'services' && 'שירותים'}
              {tab === 'settings' && 'הגדרות'}
            </h3>
            <p className="text-slate-500">
              {action === 'new' 
                ? 'טופס יצירת תור חדש יוצג כאן'
                : 'תוכן יטען בקרוב...'
              }
            </p>
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
}
