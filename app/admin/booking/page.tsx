import { Suspense } from 'react';
import { BookingAdminPanel } from '@/components/admin/BookingAdminPanel';
import { prefetchBookingData } from '@/lib/booking/cache';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { requireOrganizationId } from '@/lib/tenant-isolation';

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function BookingAdminPage({ params }: PageProps) {
  const { orgSlug } = await params;
  
  // Get organization ID
  const workspace = await requireWorkspaceAccessByOrgSlug(orgSlug);
  const organizationId = workspace.id;
  requireOrganizationId('BookingAdminPage', organizationId);

  // Prefetch all data for instant navigation
  const data = await prefetchBookingData(organizationId);

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
      />
    </Suspense>
  );
}
